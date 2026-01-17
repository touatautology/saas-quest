import { db } from '@/lib/db/drizzle';
import { tools, userQuestProgress, quests, userSettings, ToolUnlockCondition } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, asc, and } from 'drizzle-orm';
import { LocalizedText } from '@/lib/i18n';
import { hasToolSetting, ToolSettings } from '@/lib/settings-helper';

type ToolWithStatus = {
  id: number;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  icon: string | null;
  category: string | null;
  externalUrl: string | null;
  internalPath: string | null;
  unlocked: boolean;
  // アンロック進捗（どの条件が満たされているか）
  progress: {
    quests: { slug: string; completed: boolean }[];
    settings: { key: string; configured: boolean }[];
  };
};

// 設定キーの値が「設定済み」かをチェック
function isSettingConfigured(settings: typeof userSettings.$inferSelect | null, key: string): boolean {
  if (!settings) return false;

  const toolSettingsData = settings.toolSettings as ToolSettings | null;
  return hasToolSetting(toolSettingsData, key);
}

export async function GET() {
  const user = await getUser();

  // ツール一覧取得（アクティブなもののみ）
  const allTools = await db
    .select()
    .from(tools)
    .where(eq(tools.isActive, true))
    .orderBy(asc(tools.order));

  // ユーザーがログインしていない場合は全てロック
  if (!user) {
    const toolsWithStatus: ToolWithStatus[] = allTools.map(tool => ({
      id: tool.id,
      slug: tool.slug,
      name: tool.name as LocalizedText,
      description: tool.description as LocalizedText | null,
      icon: tool.icon,
      category: tool.category,
      externalUrl: tool.externalUrl,
      internalPath: tool.internalPath,
      unlocked: false,
      progress: {
        quests: [],
        settings: [],
      },
    }));
    return Response.json({ tools: toolsWithStatus });
  }

  // ユーザーの完了クエスト取得
  const completedQuests = await db
    .select({
      questSlug: quests.slug,
    })
    .from(userQuestProgress)
    .innerJoin(quests, eq(userQuestProgress.questId, quests.id))
    .where(
      and(
        eq(userQuestProgress.userId, user.id),
        eq(userQuestProgress.status, 'completed')
      )
    );

  const completedQuestSlugs = new Set(completedQuests.map(q => q.questSlug));

  // ユーザー設定取得
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  // 各ツールのアンロック状態を計算
  const toolsWithStatus: ToolWithStatus[] = allTools.map(tool => {
    const conditions = tool.unlockConditions as ToolUnlockCondition | null;

    // クエスト条件の進捗
    const questProgress = (conditions?.quests || []).map(questSlug => ({
      slug: questSlug,
      completed: completedQuestSlugs.has(questSlug),
    }));

    // 設定条件の進捗
    const settingsProgress = (conditions?.settings || []).map(settingKey => ({
      key: settingKey,
      configured: isSettingConfigured(settings, settingKey),
    }));

    // 全条件が満たされているかチェック（AND条件）
    const allQuestsCompleted = questProgress.every(q => q.completed);
    const allSettingsConfigured = settingsProgress.every(s => s.configured);
    const unlocked = allQuestsCompleted && allSettingsConfigured;

    return {
      id: tool.id,
      slug: tool.slug,
      name: tool.name as LocalizedText,
      description: tool.description as LocalizedText | null,
      icon: tool.icon,
      category: tool.category,
      externalUrl: tool.externalUrl,
      internalPath: tool.internalPath,
      unlocked,
      progress: {
        quests: questProgress,
        settings: settingsProgress,
      },
    };
  });

  return Response.json({ tools: toolsWithStatus });
}
