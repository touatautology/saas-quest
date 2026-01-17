import { db } from '@/lib/db/drizzle';
import {
  rewards,
  userRewards,
  userCurrency,
  userQuestProgress,
  quests,
  chapters,
  activityLogs,
  type RewardConditionConfig,
  type Reward,
  ActivityType,
} from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { getUserWithTeam } from '@/lib/db/queries';

// ユーザーの完了クエストIDを取得
async function getCompletedQuestIds(userId: number): Promise<number[]> {
  const completed = await db
    .select({ questId: userQuestProgress.questId })
    .from(userQuestProgress)
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.status, 'completed')
      )
    );
  return completed.map((p) => p.questId);
}

// チャプター内の全クエストIDを取得
async function getQuestIdsByChapter(chapterId: number): Promise<number[]> {
  const chapterQuests = await db
    .select({ id: quests.id })
    .from(quests)
    .where(eq(quests.chapterId, chapterId));
  return chapterQuests.map((q) => q.id);
}

// ブック内の全クエストIDを取得
async function getQuestIdsByBook(bookId: number): Promise<number[]> {
  const bookChapters = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.bookId, bookId));

  if (bookChapters.length === 0) return [];

  const chapterIds = bookChapters.map((c) => c.id);
  const bookQuests = await db
    .select({ id: quests.id })
    .from(quests)
    .where(inArray(quests.chapterId, chapterIds));
  return bookQuests.map((q) => q.id);
}

// リワード条件を満たしているかチェック
function checkCondition(
  condition: RewardConditionConfig,
  completedQuestIds: number[],
  requiredQuestIds: number[]
): boolean {
  switch (condition.type) {
    case 'quest':
      return completedQuestIds.includes(condition.questId);

    case 'chapter':
    case 'book':
      // requiredQuestIdsに必要なクエストIDが入っている
      if (requiredQuestIds.length === 0) return false;
      return requiredQuestIds.every((id) => completedQuestIds.includes(id));

    case 'custom':
      if (condition.requireAll) {
        return condition.questIds.every((id) => completedQuestIds.includes(id));
      } else {
        return condition.questIds.some((id) => completedQuestIds.includes(id));
      }

    default:
      return false;
  }
}

// Activity Logに記録
async function logRewardEarned(
  userId: number,
  rewardId: number,
  rewardSlug: string
): Promise<void> {
  const userWithTeam = await getUserWithTeam(userId);
  if (!userWithTeam?.teamId) return;

  await db.insert(activityLogs).values({
    teamId: userWithTeam.teamId,
    userId,
    action: `${ActivityType.REWARD_EARNED}:${rewardSlug}`,
    ipAddress: '',
  });
}

// コイン残高を加算
async function addCoins(userId: number, amount: number): Promise<void> {
  if (amount <= 0) return;

  await db
    .insert(userCurrency)
    .values({
      userId,
      coins: amount,
    })
    .onConflictDoUpdate({
      target: userCurrency.userId,
      set: {
        coins: sql`${userCurrency.coins} + ${amount}`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

// リワードを付与
async function grantReward(
  userId: number,
  reward: Reward
): Promise<void> {
  // ユーザーリワードを追加
  await db.insert(userRewards).values({
    userId,
    rewardId: reward.id,
  });

  // コインタイプの場合は残高を加算
  if (reward.type === 'coin' && reward.value && reward.value > 0) {
    await addCoins(userId, reward.value);
  }

  // Activity Logに記録
  await logRewardEarned(userId, reward.id, reward.slug);
}

// ユーザーが既に獲得しているリワードIDを取得
async function getEarnedRewardIds(userId: number): Promise<number[]> {
  const earned = await db
    .select({ rewardId: userRewards.rewardId })
    .from(userRewards)
    .where(eq(userRewards.userId, userId));
  return earned.map((r) => r.rewardId);
}

// メイン関数: リワードをチェックして付与
export async function checkAndGrantRewards(userId: number): Promise<Reward[]> {
  // 有効なリワード一覧を取得
  const activeRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.isActive, true));

  if (activeRewards.length === 0) return [];

  // ユーザーの完了クエストIDを取得
  const completedQuestIds = await getCompletedQuestIds(userId);

  // 既に獲得済みのリワードIDを取得
  const earnedRewardIds = await getEarnedRewardIds(userId);

  // 未獲得のリワードをフィルタ
  const unearnedRewards = activeRewards.filter(
    (r) => !earnedRewardIds.includes(r.id)
  );

  const grantedRewards: Reward[] = [];

  for (const reward of unearnedRewards) {
    const condition = reward.conditionConfig;
    let requiredQuestIds: number[] = [];

    // chapter/bookタイプの場合は必要なクエストIDを取得
    if (condition.type === 'chapter') {
      requiredQuestIds = await getQuestIdsByChapter(condition.chapterId);
    } else if (condition.type === 'book') {
      requiredQuestIds = await getQuestIdsByBook(condition.bookId);
    }

    // 条件チェック
    const isSatisfied = checkCondition(condition, completedQuestIds, requiredQuestIds);

    if (isSatisfied) {
      await grantReward(userId, reward);
      grantedRewards.push(reward);
    }
  }

  return grantedRewards;
}

// ユーザーのコイン残高を取得
export async function getUserCoins(userId: number): Promise<number> {
  const result = await db
    .select({ coins: userCurrency.coins })
    .from(userCurrency)
    .where(eq(userCurrency.userId, userId))
    .limit(1);

  return result[0]?.coins ?? 0;
}

// ユーザーの獲得リワード一覧を取得
export async function getUserRewards(userId: number): Promise<(Reward & { earnedAt: Date })[]> {
  const result = await db
    .select({
      reward: rewards,
      earnedAt: userRewards.earnedAt,
    })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(eq(userRewards.userId, userId))
    .orderBy(userRewards.earnedAt);

  return result.map((r) => ({
    ...r.reward,
    earnedAt: r.earnedAt,
  }));
}

// 全リワード一覧を取得（獲得状況付き）
export async function getAllRewardsWithStatus(
  userId: number
): Promise<(Reward & { earned: boolean; earnedAt: Date | null })[]> {
  const allRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.isActive, true))
    .orderBy(rewards.type, rewards.id);

  const earnedRewards = await db
    .select({
      rewardId: userRewards.rewardId,
      earnedAt: userRewards.earnedAt,
    })
    .from(userRewards)
    .where(eq(userRewards.userId, userId));

  const earnedMap = new Map(
    earnedRewards.map((r) => [r.rewardId, r.earnedAt])
  );

  return allRewards.map((reward) => ({
    ...reward,
    earned: earnedMap.has(reward.id),
    earnedAt: earnedMap.get(reward.id) ?? null,
  }));
}
