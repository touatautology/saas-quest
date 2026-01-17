import { db } from '@/lib/db/drizzle';
import { users, userQuestProgress, quests, chapters, books, teamMembers, teams } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, inArray, asc } from 'drizzle-orm';

// ユーザーの進捗を取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getUser();

  if (!currentUser || currentUser.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  // 対象ユーザーを取得
  const [targetUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!targetUser) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // ユーザーのチーム情報を取得
  const userTeamData = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      role: teamMembers.role,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      stripeCustomerId: teams.stripeCustomerId,
      stripeSubscriptionId: teams.stripeSubscriptionId,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));

  const teamInfo = userTeamData.length > 0 ? userTeamData[0] : null;

  // Book、Chapter、Quest一覧を取得
  const allBooks = await db
    .select()
    .from(books)
    .orderBy(asc(books.order));

  const allChapters = await db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.order));

  const allQuests = await db
    .select()
    .from(quests)
    .orderBy(asc(quests.chapterId), asc(quests.order));

  // ユーザーの進捗を取得
  const progress = await db
    .select()
    .from(userQuestProgress)
    .where(eq(userQuestProgress.userId, userId));

  // 進捗マップを作成
  const progressMap = new Map(
    progress.map((p) => [p.questId, p])
  );

  // クエストごとのステータスを計算
  const questProgress = allQuests.map((quest) => {
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

  return Response.json({
    user: targetUser,
    team: teamInfo,
    books: allBooks,
    chapters: allChapters,
    quests: allQuests,
    progress: questProgress,
  });
}

// 進捗をリセット
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getUser();

  if (!currentUser || currentUser.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const { searchParams } = new URL(request.url);

  // リセット対象を決定
  const questId = searchParams.get('questId');
  const chapterId = searchParams.get('chapterId');
  const bookId = searchParams.get('bookId');
  const resetAll = searchParams.get('all') === 'true';

  try {
    if (questId) {
      // 特定のクエストのみリセット
      await db
        .delete(userQuestProgress)
        .where(
          and(
            eq(userQuestProgress.userId, userId),
            eq(userQuestProgress.questId, parseInt(questId))
          )
        );
      return Response.json({ success: true, message: 'Quest progress reset' });
    }

    if (chapterId) {
      // チャプター内の全クエストをリセット
      const chapterQuests = await db
        .select({ id: quests.id })
        .from(quests)
        .where(eq(quests.chapterId, parseInt(chapterId)));

      const questIds = chapterQuests.map((q) => q.id);
      if (questIds.length > 0) {
        await db
          .delete(userQuestProgress)
          .where(
            and(
              eq(userQuestProgress.userId, userId),
              inArray(userQuestProgress.questId, questIds)
            )
          );
      }
      return Response.json({ success: true, message: 'Chapter progress reset' });
    }

    if (bookId) {
      // ブック内の全クエストをリセット
      const bookChapters = await db
        .select({ id: chapters.id })
        .from(chapters)
        .where(eq(chapters.bookId, parseInt(bookId)));

      const chapterIds = bookChapters.map((c) => c.id);
      if (chapterIds.length > 0) {
        const bookQuests = await db
          .select({ id: quests.id })
          .from(quests)
          .where(inArray(quests.chapterId, chapterIds));

        const questIds = bookQuests.map((q) => q.id);
        if (questIds.length > 0) {
          await db
            .delete(userQuestProgress)
            .where(
              and(
                eq(userQuestProgress.userId, userId),
                inArray(userQuestProgress.questId, questIds)
              )
            );
        }
      }
      return Response.json({ success: true, message: 'Book progress reset' });
    }

    if (resetAll) {
      // 全進捗をリセット
      await db
        .delete(userQuestProgress)
        .where(eq(userQuestProgress.userId, userId));
      return Response.json({ success: true, message: 'All progress reset' });
    }

    return Response.json(
      { error: 'No reset target specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to reset progress:', error);
    return Response.json({ error: 'Failed to reset progress' }, { status: 500 });
  }
}
