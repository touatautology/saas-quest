import { db } from '@/lib/db/drizzle';
import { quests, userQuestProgress, chapters, books } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const user = await getUser();

  // ブック一覧を取得
  const allBooks = await db
    .select()
    .from(books)
    .orderBy(asc(books.order));

  // チャプター一覧を取得
  const allChapters = await db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.order));

  // クエスト一覧を取得（チャプターID、チャプター内の順序でソート）
  const allQuests = await db
    .select()
    .from(quests)
    .orderBy(asc(quests.chapterId), asc(quests.order));

  // ユーザーがログインしていない場合は、全て locked
  if (!user) {
    const progress = allQuests.map((quest) => ({
      questId: quest.id,
      status: 'locked' as const,
      completedAt: null,
    }));

    return Response.json({ books: allBooks, chapters: allChapters, quests: allQuests, progress });
  }

  // ユーザーの進捗を取得
  const userProgress = await db
    .select()
    .from(userQuestProgress)
    .where(eq(userQuestProgress.userId, user.id));

  // 進捗マップを作成
  const progressMap = new Map(
    userProgress.map((p) => [p.questId, p])
  );

  // 各クエストのステータスを計算
  const progress = allQuests.map((quest) => {
    const existingProgress = progressMap.get(quest.id);

    if (existingProgress) {
      return {
        questId: quest.id,
        status: existingProgress.status as 'locked' | 'available' | 'completed',
        completedAt: existingProgress.completedAt?.toISOString() || null,
      };
    }

    // 進捗がない場合、前提クエストの状態をチェック
    if (quest.prerequisiteQuestId) {
      const prereqProgress = progressMap.get(quest.prerequisiteQuestId);
      if (!prereqProgress || prereqProgress.status !== 'completed') {
        return {
          questId: quest.id,
          status: 'locked' as const,
          completedAt: null,
        };
      }
    }

    // 前提がないか、前提が完了している場合は available
    return {
      questId: quest.id,
      status: 'available' as const,
      completedAt: null,
    };
  });

  return Response.json({ books: allBooks, chapters: allChapters, quests: allQuests, progress });
}
