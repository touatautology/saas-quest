import { db } from '@/lib/db/drizzle';
import { questDocuments, quests, chapters, books } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, isNotNull, asc } from 'drizzle-orm';
import { LocalizedText } from '@/lib/i18n';

type DocumentItem = {
  id: number;
  title: LocalizedText;
  contentType: string;
};

type QuestWithDocs = {
  id: number;
  slug: string;
  title: LocalizedText;
  documents: DocumentItem[];
};

type ChapterWithDocs = {
  id: number;
  slug: string;
  title: LocalizedText;
  documents: DocumentItem[];
  quests: QuestWithDocs[];
};

type BookWithDocs = {
  id: number;
  slug: string;
  title: LocalizedText;
  documents: DocumentItem[];
  chapters: ChapterWithDocs[];
};

// ユーザー向けドキュメント一覧を取得
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const questId = searchParams.get('questId');

  // 特定のクエストのドキュメントを取得
  if (questId) {
    const documents = await db
      .select({
        id: questDocuments.id,
        title: questDocuments.title,
        contentType: questDocuments.contentType,
        questId: questDocuments.questId,
      })
      .from(questDocuments)
      .where(eq(questDocuments.questId, parseInt(questId)))
      .orderBy(questDocuments.createdAt);

    return Response.json({ documents });
  }

  // 階層構造でドキュメントを取得

  // 1. 全ドキュメント取得（embeddingがあるもののみ）
  const allDocs = await db
    .select({
      id: questDocuments.id,
      title: questDocuments.title,
      contentType: questDocuments.contentType,
      questId: questDocuments.questId,
      chapterId: questDocuments.chapterId,
      bookId: questDocuments.bookId,
    })
    .from(questDocuments)
    .where(isNotNull(questDocuments.embedding))
    .orderBy(questDocuments.createdAt);

  // 2. 全ブック取得
  const allBooks = await db
    .select({
      id: books.id,
      slug: books.slug,
      title: books.title,
      order: books.order,
    })
    .from(books)
    .orderBy(asc(books.order));

  // 3. 全チャプター取得
  const allChapters = await db
    .select({
      id: chapters.id,
      slug: chapters.slug,
      title: chapters.title,
      bookId: chapters.bookId,
      order: chapters.order,
    })
    .from(chapters)
    .orderBy(asc(chapters.order));

  // 4. 全クエスト取得
  const allQuests = await db
    .select({
      id: quests.id,
      slug: quests.slug,
      title: quests.title,
      chapterId: quests.chapterId,
      order: quests.order,
    })
    .from(quests)
    .orderBy(asc(quests.order));

  // ドキュメントをレベル別に分類
  const bookDocs = allDocs.filter(d => d.bookId && !d.chapterId && !d.questId);
  const chapterDocs = allDocs.filter(d => d.chapterId && !d.questId);
  const questDocs = allDocs.filter(d => d.questId);

  // ドキュメントがあるクエストのみ抽出
  const questIdsWithDocs = new Set(questDocs.map(d => d.questId));
  const questsWithDocs = allQuests.filter(q => questIdsWithDocs.has(q.id));

  // ドキュメントがあるチャプターを特定（直接のドキュメントまたは子クエストにドキュメントがある）
  const chapterIdsWithDocs = new Set([
    ...chapterDocs.map(d => d.chapterId),
    ...questsWithDocs.map(q => q.chapterId).filter(Boolean),
  ]);
  const chaptersWithDocs = allChapters.filter(c => chapterIdsWithDocs.has(c.id));

  // ドキュメントがあるブックを特定（直接のドキュメントまたは子チャプターにドキュメントがある）
  const bookIdsWithDocs = new Set([
    ...bookDocs.map(d => d.bookId),
    ...chaptersWithDocs.map(c => c.bookId).filter(Boolean),
  ]);
  const booksWithDocs = allBooks.filter(b => bookIdsWithDocs.has(b.id));

  // 階層構造を構築
  const hierarchy: BookWithDocs[] = booksWithDocs.map(book => {
    const bookChapters = chaptersWithDocs
      .filter(c => c.bookId === book.id)
      .map(chapter => {
        const chapterQuests = questsWithDocs
          .filter(q => q.chapterId === chapter.id)
          .map(quest => ({
            id: quest.id,
            slug: quest.slug,
            title: quest.title as LocalizedText,
            documents: questDocs
              .filter(d => d.questId === quest.id)
              .map(d => ({
                id: d.id,
                title: d.title as LocalizedText,
                contentType: d.contentType,
              })),
          }));

        return {
          id: chapter.id,
          slug: chapter.slug,
          title: chapter.title as LocalizedText,
          documents: chapterDocs
            .filter(d => d.chapterId === chapter.id)
            .map(d => ({
              id: d.id,
              title: d.title as LocalizedText,
              contentType: d.contentType,
            })),
          quests: chapterQuests,
        };
      });

    return {
      id: book.id,
      slug: book.slug,
      title: book.title as LocalizedText,
      documents: bookDocs
        .filter(d => d.bookId === book.id)
        .map(d => ({
          id: d.id,
          title: d.title as LocalizedText,
          contentType: d.contentType,
        })),
      chapters: bookChapters,
    };
  });

  // ブックに属さないチャプター（Unsortedなど）
  const orphanChapters = chaptersWithDocs
    .filter(c => !c.bookId)
    .map(chapter => {
      const chapterQuests = questsWithDocs
        .filter(q => q.chapterId === chapter.id)
        .map(quest => ({
          id: quest.id,
          slug: quest.slug,
          title: quest.title as LocalizedText,
          documents: questDocs
            .filter(d => d.questId === quest.id)
            .map(d => ({
              id: d.id,
              title: d.title as LocalizedText,
              contentType: d.contentType,
            })),
        }));

      return {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title as LocalizedText,
        documents: chapterDocs
          .filter(d => d.chapterId === chapter.id)
          .map(d => ({
            id: d.id,
            title: d.title as LocalizedText,
            contentType: d.contentType,
          })),
        quests: chapterQuests,
      };
    });

  return Response.json({
    hierarchy,
    orphanChapters,
  });
}
