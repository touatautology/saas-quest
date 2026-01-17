import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { questDocuments, books, chapters, quests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    // ドキュメントを取得
    const [doc] = await db
      .select({
        id: questDocuments.id,
        title: questDocuments.title,
        content: questDocuments.content,
        contentType: questDocuments.contentType,
        bookId: questDocuments.bookId,
        chapterId: questDocuments.chapterId,
        questId: questDocuments.questId,
      })
      .from(questDocuments)
      .where(eq(questDocuments.id, documentId))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 親情報を取得
    let parent: { type: 'book' | 'chapter' | 'quest'; slug: string; title: unknown } | null = null;

    if (doc.questId) {
      const [quest] = await db
        .select({ slug: quests.slug, title: quests.title })
        .from(quests)
        .where(eq(quests.id, doc.questId))
        .limit(1);
      if (quest) {
        parent = { type: 'quest', slug: quest.slug, title: quest.title };
      }
    } else if (doc.chapterId) {
      const [chapter] = await db
        .select({ slug: chapters.slug, title: chapters.title })
        .from(chapters)
        .where(eq(chapters.id, doc.chapterId))
        .limit(1);
      if (chapter) {
        parent = { type: 'chapter', slug: chapter.slug, title: chapter.title };
      }
    } else if (doc.bookId) {
      const [book] = await db
        .select({ slug: books.slug, title: books.title })
        .from(books)
        .where(eq(books.id, doc.bookId))
        .limit(1);
      if (book) {
        parent = { type: 'book', slug: book.slug, title: book.title };
      }
    }

    return NextResponse.json({
      document: doc,
      parent,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
