import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import {
  users,
  quests,
  questDocuments,
  userQuestProgress,
  activityLogs,
  teamMembers,
  teams,
  rewards,
  userRewards,
  tools,
  settingDefinitions,
  User,
  Quest,
  QuestDocument,
  UserRole,
  Reward,
  RewardConditionConfig,
  QuestVerificationConfig,
  Tool,
  ToolUnlockCondition,
  SettingDefinition,
} from '@/lib/db/schema';
import { desc, eq, isNull, sql, count, and } from 'drizzle-orm';
import { clearEncryptedKeysCache } from '@/lib/settings-helper';

// Admin権限チェック
export async function requireAdmin() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }
  return user;
}

// Admin権限チェック（APIルート用、リダイレクトなし）
export async function getAdminUser() {
  const user = await getUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

// 統計情報を取得
export async function getAdminStats() {
  // 総ユーザー数
  const totalUsersResult = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt));
  const totalUsers = totalUsersResult[0]?.count || 0;

  // 過去7日間のアクティブユーザー数
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeUsersResult = await db
    .select({ count: sql<number>`count(distinct ${activityLogs.userId})` })
    .from(activityLogs)
    .where(sql`${activityLogs.timestamp} >= ${sevenDaysAgo.toISOString()}`);
  const activeUsers = activeUsersResult[0]?.count || 0;

  // 総クエスト数
  const totalQuestsResult = await db.select({ count: count() }).from(quests);
  const totalQuests = totalQuestsResult[0]?.count || 0;

  // クエスト完了率
  const completedQuestsResult = await db
    .select({ count: count() })
    .from(userQuestProgress)
    .where(eq(userQuestProgress.status, 'completed'));
  const completedQuests = completedQuestsResult[0]?.count || 0;

  const totalProgressResult = await db
    .select({ count: count() })
    .from(userQuestProgress);
  const totalProgress = totalProgressResult[0]?.count || 0;

  const completionRate =
    totalProgress > 0 ? Math.round((completedQuests / totalProgress) * 100) : 0;

  return {
    totalUsers,
    activeUsers,
    totalQuests,
    completionRate,
  };
}

// 最近のアクティビティを取得
export async function getRecentActivity(limit: number = 10) {
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
}

// ユーザー一覧を取得（サブスク情報付き）
export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search?: string
) {
  const offset = (page - 1) * limit;

  // ユーザー一覧を取得
  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  // 各ユーザーのサブスク情報を取得
  const userIds = userList.map(u => u.id);
  const subscriptions = userIds.length > 0
    ? await db
        .select({
          userId: teamMembers.userId,
          planName: teams.planName,
          subscriptionStatus: teams.subscriptionStatus,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(sql`${teamMembers.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // サブスク情報をマップに変換
  const subscriptionMap = new Map(
    subscriptions.map(s => [s.userId, { planName: s.planName, subscriptionStatus: s.subscriptionStatus }])
  );

  // ユーザー情報にサブスク情報を追加
  const result = userList.map(user => ({
    ...user,
    planName: subscriptionMap.get(user.id)?.planName || null,
    subscriptionStatus: subscriptionMap.get(user.id)?.subscriptionStatus || null,
  }));

  // 総数を取得
  const totalResult = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt));
  const total = totalResult[0]?.count || 0;

  return { users: result, total };
}

// サブスクリプション統計を取得
export async function getSubscriptionStats() {
  // プラン別ユーザー数
  const planStats = await db
    .select({
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      count: count(),
    })
    .from(teams)
    .groupBy(teams.planName, teams.subscriptionStatus);

  // 統計を整理
  const stats: {
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
    activeSubscriptions: number;
  } = {
    byPlan: {},
    byStatus: {},
    total: 0,
    activeSubscriptions: 0,
  };

  for (const row of planStats) {
    const planName = row.planName || 'Free';
    const status = row.subscriptionStatus || 'none';
    const cnt = Number(row.count);

    stats.byPlan[planName] = (stats.byPlan[planName] || 0) + cnt;
    stats.byStatus[status] = (stats.byStatus[status] || 0) + cnt;
    stats.total += cnt;

    if (row.subscriptionStatus === 'active' || row.subscriptionStatus === 'trialing') {
      stats.activeSubscriptions += cnt;
    }
  }

  return stats;
}

// ユーザーロールを更新
export async function updateUserRole(userId: number, role: UserRole) {
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ユーザーを削除（ソフトデリート）
export async function softDeleteUser(userId: number) {
  await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// クエスト一覧を取得
export async function getQuestsAdmin(): Promise<Quest[]> {
  return await db
    .select()
    .from(quests)
    .orderBy(quests.order);
}

// LocalizedText型
type LocalizedTextInput = {
  en: string;
  ja?: string;
  es?: string;
  zh?: string;
  ko?: string;
};

// クエストを作成（JSONB形式で保存）
export async function createQuest(data: {
  slug: string;
  title: string | LocalizedTextInput;
  description?: string | LocalizedTextInput | null;
  category: string;
  prerequisiteQuestId?: number;
  verificationType: string;
  verificationConfig?: QuestVerificationConfig | null;
  chapterId?: number | null;
}) {
  // 最大orderを取得
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`max(${quests.order})` })
    .from(quests);
  const maxOrder = maxOrderResult[0]?.maxOrder || 0;

  // title/descriptionが文字列の場合は{en: ...}形式に変換
  const titleValue = typeof data.title === 'string' ? { en: data.title } : data.title;
  const descValue = data.description
    ? (typeof data.description === 'string' ? { en: data.description } : data.description)
    : null;

  const result = await db
    .insert(quests)
    .values({
      slug: data.slug,
      title: titleValue,
      description: descValue,
      category: data.category,
      prerequisiteQuestId: data.prerequisiteQuestId,
      verificationType: data.verificationType,
      verificationConfig: data.verificationConfig ?? null,
      order: maxOrder + 1,
      chapterId: data.chapterId ?? null,
    })
    .returning();

  return result[0];
}

// クエストを更新（JSONB形式で保存）
export async function updateQuest(
  id: number,
  data: Partial<{
    slug: string;
    title: string | LocalizedTextInput;
    description: string | LocalizedTextInput | null;
    category: string;
    chapterId: number | null;
    prerequisiteQuestId: number | null;
    verificationType: string;
    verificationConfig: QuestVerificationConfig | null;
    order: number;
  }>
) {
  const updateData: Record<string, unknown> = {};

  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.title !== undefined) {
    // 文字列の場合は{en: ...}形式に変換、オブジェクトの場合はそのまま
    updateData.title = typeof data.title === 'string' ? { en: data.title } : data.title;
  }
  if (data.description !== undefined) {
    if (data.description === null) {
      updateData.description = null;
    } else {
      updateData.description = typeof data.description === 'string' ? { en: data.description } : data.description;
    }
  }
  if (data.category !== undefined) updateData.category = data.category;
  if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
  if (data.prerequisiteQuestId !== undefined) updateData.prerequisiteQuestId = data.prerequisiteQuestId;
  if (data.verificationType !== undefined) updateData.verificationType = data.verificationType;
  if (data.verificationConfig !== undefined) updateData.verificationConfig = data.verificationConfig;
  if (data.order !== undefined) updateData.order = data.order;

  await db.update(quests).set(updateData).where(eq(quests.id, id));
}

// クエストを削除
export async function deleteQuest(id: number) {
  // 関連するドキュメントも削除
  await db.delete(questDocuments).where(eq(questDocuments.questId, id));
  // 関連する進捗も削除
  await db.delete(userQuestProgress).where(eq(userQuestProgress.questId, id));
  // クエストを削除
  await db.delete(quests).where(eq(quests.id, id));
}

// クエスト順序を更新
export async function reorderQuests(questIds: number[]) {
  for (let i = 0; i < questIds.length; i++) {
    await db
      .update(quests)
      .set({ order: i + 1 })
      .where(eq(quests.id, questIds[i]));
  }
}

// ドキュメント一覧を取得
export async function getDocuments(filter?: {
  bookId?: number;
  chapterId?: number;
  questId?: number;
}): Promise<QuestDocument[]> {
  if (filter?.bookId) {
    return await db
      .select()
      .from(questDocuments)
      .where(eq(questDocuments.bookId, filter.bookId))
      .orderBy(questDocuments.createdAt);
  }
  if (filter?.chapterId) {
    return await db
      .select()
      .from(questDocuments)
      .where(eq(questDocuments.chapterId, filter.chapterId))
      .orderBy(questDocuments.createdAt);
  }
  if (filter?.questId) {
    return await db
      .select()
      .from(questDocuments)
      .where(eq(questDocuments.questId, filter.questId))
      .orderBy(questDocuments.createdAt);
  }
  return await db
    .select()
    .from(questDocuments)
    .orderBy(questDocuments.bookId, questDocuments.chapterId, questDocuments.questId, questDocuments.createdAt);
}

// ドキュメントを作成（文字列をJSONB形式に変換）
export async function createDocument(data: {
  bookId?: number | null;
  chapterId?: number | null;
  questId?: number | null;
  title: string;
  content: string;
  contentType: string;
}) {
  const result = await db
    .insert(questDocuments)
    .values({
      bookId: data.bookId || null,
      chapterId: data.chapterId || null,
      questId: data.questId || null,
      title: { en: data.title },
      content: { en: data.content },
      contentType: data.contentType,
    })
    .returning();
  return result[0];
}

// ドキュメントを更新（文字列をJSONB形式に変換）
export async function updateDocument(
  id: number,
  data: Partial<{
    bookId: number | null;
    chapterId: number | null;
    questId: number | null;
    title: string;
    content: string;
    contentType: string;
  }>
) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.bookId !== undefined) updateData.bookId = data.bookId;
  if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
  if (data.questId !== undefined) updateData.questId = data.questId;
  if (data.title !== undefined) updateData.title = { en: data.title };
  if (data.content !== undefined) updateData.content = { en: data.content };
  if (data.contentType !== undefined) updateData.contentType = data.contentType;

  await db
    .update(questDocuments)
    .set(updateData)
    .where(eq(questDocuments.id, id));
}

// ドキュメントを削除
export async function deleteDocument(id: number) {
  await db.delete(questDocuments).where(eq(questDocuments.id, id));
}

// ドキュメントのembeddingをクリア（再生成用）
export async function clearDocumentEmbedding(id: number) {
  await db
    .update(questDocuments)
    .set({ embedding: null, updatedAt: new Date() })
    .where(eq(questDocuments.id, id));
}

// ========== リワード管理 ==========

// リワード一覧を取得
export async function getRewardsAdmin(): Promise<Reward[]> {
  return await db
    .select()
    .from(rewards)
    .orderBy(rewards.type, rewards.id);
}

// リワードを作成
export async function createReward(data: {
  slug: string;
  title: LocalizedTextInput;
  description?: LocalizedTextInput | null;
  type: 'badge' | 'coin' | 'perk';
  value?: number;
  iconUrl?: string | null;
  conditionType: 'quest' | 'chapter' | 'book' | 'custom';
  conditionConfig: RewardConditionConfig;
  isActive?: boolean;
}): Promise<Reward> {
  const result = await db
    .insert(rewards)
    .values({
      slug: data.slug,
      title: data.title,
      description: data.description || null,
      type: data.type,
      value: data.value || 0,
      iconUrl: data.iconUrl || null,
      conditionType: data.conditionType,
      conditionConfig: data.conditionConfig,
      isActive: data.isActive ?? true,
    })
    .returning();

  return result[0];
}

// リワードを更新
export async function updateReward(
  id: number,
  data: Partial<{
    slug: string;
    title: LocalizedTextInput;
    description: LocalizedTextInput | null;
    type: 'badge' | 'coin' | 'perk';
    value: number;
    iconUrl: string | null;
    conditionType: 'quest' | 'chapter' | 'book' | 'custom';
    conditionConfig: RewardConditionConfig;
    isActive: boolean;
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.iconUrl !== undefined) updateData.iconUrl = data.iconUrl;
  if (data.conditionType !== undefined) updateData.conditionType = data.conditionType;
  if (data.conditionConfig !== undefined) updateData.conditionConfig = data.conditionConfig;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db.update(rewards).set(updateData).where(eq(rewards.id, id));
}

// リワードを削除
export async function deleteReward(id: number): Promise<void> {
  // 関連するユーザーリワードも削除
  await db.delete(userRewards).where(eq(userRewards.rewardId, id));
  // リワードを削除
  await db.delete(rewards).where(eq(rewards.id, id));
}

// ========== ツール管理 ==========

// ツール一覧を取得
export async function getToolsAdmin(): Promise<Tool[]> {
  return await db
    .select()
    .from(tools)
    .orderBy(tools.order);
}

// ツールを作成
export async function createTool(data: {
  slug: string;
  name: LocalizedTextInput;
  description?: LocalizedTextInput | null;
  icon?: string | null;
  category?: string | null;
  externalUrl?: string | null;
  internalPath?: string | null;
  unlockConditions?: ToolUnlockCondition | null;
  isActive?: boolean;
}): Promise<Tool> {
  // 最大orderを取得
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`max(${tools.order})` })
    .from(tools);
  const maxOrder = maxOrderResult[0]?.maxOrder || 0;

  const result = await db
    .insert(tools)
    .values({
      slug: data.slug,
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      category: data.category || null,
      externalUrl: data.externalUrl || null,
      internalPath: data.internalPath || null,
      unlockConditions: data.unlockConditions || null,
      order: maxOrder + 1,
      isActive: data.isActive ?? true,
    })
    .returning();

  return result[0];
}

// ツールを更新
export async function updateTool(
  id: number,
  data: Partial<{
    slug: string;
    name: LocalizedTextInput;
    description: LocalizedTextInput | null;
    icon: string | null;
    category: string | null;
    externalUrl: string | null;
    internalPath: string | null;
    unlockConditions: ToolUnlockCondition | null;
    order: number;
    isActive: boolean;
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.externalUrl !== undefined) updateData.externalUrl = data.externalUrl;
  if (data.internalPath !== undefined) updateData.internalPath = data.internalPath;
  if (data.unlockConditions !== undefined) updateData.unlockConditions = data.unlockConditions;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db.update(tools).set(updateData).where(eq(tools.id, id));
}

// ツールを削除
export async function deleteTool(id: number): Promise<void> {
  await db.delete(tools).where(eq(tools.id, id));
}

// ツール順序を更新
export async function reorderTools(toolIds: number[]) {
  for (let i = 0; i < toolIds.length; i++) {
    await db
      .update(tools)
      .set({ order: i + 1 })
      .where(eq(tools.id, toolIds[i]));
  }
}

// ========== 設定定義管理 ==========

// 設定定義一覧を取得
export async function getSettingDefinitionsAdmin(): Promise<SettingDefinition[]> {
  return await db
    .select()
    .from(settingDefinitions)
    .orderBy(settingDefinitions.order);
}

// 設定定義を作成
export async function createSettingDefinition(data: {
  key: string;
  name: LocalizedTextInput;
  description?: LocalizedTextInput | null;
  category?: string | null;
  valueType: string;
  isEncrypted?: boolean;
  isActive?: boolean;
}): Promise<SettingDefinition> {
  // 最大orderを取得
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`max(${settingDefinitions.order})` })
    .from(settingDefinitions);
  const maxOrder = maxOrderResult[0]?.maxOrder || 0;

  const result = await db
    .insert(settingDefinitions)
    .values({
      key: data.key,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      valueType: data.valueType,
      isEncrypted: data.isEncrypted ?? false,
      order: maxOrder + 1,
      isActive: data.isActive ?? true,
    })
    .returning();

  // 暗号化キーキャッシュをクリア（新しい設定が追加された可能性があるため）
  clearEncryptedKeysCache();

  return result[0];
}

// 設定定義を更新
export async function updateSettingDefinition(
  id: number,
  data: Partial<{
    key: string;
    name: LocalizedTextInput;
    description: LocalizedTextInput | null;
    category: string | null;
    valueType: string;
    isEncrypted: boolean;
    order: number;
    isActive: boolean;
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.key !== undefined) updateData.key = data.key;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.valueType !== undefined) updateData.valueType = data.valueType;
  if (data.isEncrypted !== undefined) updateData.isEncrypted = data.isEncrypted;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db.update(settingDefinitions).set(updateData).where(eq(settingDefinitions.id, id));

  // 暗号化キーキャッシュをクリア（isEncryptedが変更された可能性があるため）
  clearEncryptedKeysCache();
}

// 設定定義を削除
export async function deleteSettingDefinition(id: number): Promise<void> {
  await db.delete(settingDefinitions).where(eq(settingDefinitions.id, id));

  // 暗号化キーキャッシュをクリア（暗号化対象キーが削除された可能性があるため）
  clearEncryptedKeysCache();
}
