import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { books, chapters, quests, rewards, questDocuments } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

// 多言語テキストの型
type LocalizedText = { en: string; es?: string; ja?: string; zh?: string; ko?: string };

// エクスポートデータの型定義
export type ExportData = {
  version: string;
  exportedAt: string;
  data: {
    books: Array<{
      slug: string;
      title: LocalizedText;
      description: LocalizedText | null;
      order: number;
    }>;
    chapters: Array<{
      slug: string;
      title: LocalizedText;
      description: LocalizedText | null;
      bookSlug: string | null;
      order: number;
    }>;
    quests: Array<{
      slug: string;
      title: LocalizedText;
      description: LocalizedText | null;
      chapterSlug: string;
      order: number;
      category: string;
      verificationType: string;
      prerequisiteQuestSlug: string | null;
    }>;
    rewards: Array<{
      slug: string;
      title: LocalizedText;
      description: LocalizedText | null;
      type: string;
      value: number;
      iconUrl: string | null;
      conditionType: string;
      conditionConfig: unknown;
      isActive: boolean;
    }>;
    documents: Array<{
      questSlug: string;
      title: LocalizedText;
      content: LocalizedText;
      contentType: string;
    }>;
  };
};

export async function GET() {
  try {
    // すべてのデータを取得
    const allBooks = await db.select().from(books).orderBy(asc(books.order));
    const allChapters = await db.select().from(chapters).orderBy(asc(chapters.order));
    const allQuests = await db.select().from(quests).orderBy(asc(quests.order));
    const allRewards = await db.select().from(rewards);
    const allDocuments = await db.select().from(questDocuments);

    // IDからslugへのマッピングを作成
    const bookIdToSlug = new Map(allBooks.map(b => [b.id, b.slug]));
    const chapterIdToSlug = new Map(allChapters.map(c => [c.id, c.slug]));
    const questIdToSlug = new Map(allQuests.map(q => [q.id, q.slug]));

    // エクスポートデータを構築（IDをslugに変換）
    const exportData: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        books: allBooks.map(b => ({
          slug: b.slug,
          title: b.title,
          description: b.description,
          order: b.order,
        })),
        chapters: allChapters.map(c => ({
          slug: c.slug,
          title: c.title,
          description: c.description,
          bookSlug: c.bookId ? bookIdToSlug.get(c.bookId) || null : null,
          order: c.order,
        })),
        quests: allQuests.map(q => ({
          slug: q.slug,
          title: q.title,
          description: q.description,
          chapterSlug: chapterIdToSlug.get(q.chapterId!) || '',
          order: q.order,
          category: q.category || 'setup',
          verificationType: q.verificationType || 'manual',
          prerequisiteQuestSlug: q.prerequisiteQuestId ? questIdToSlug.get(q.prerequisiteQuestId) || null : null,
        })),
        rewards: allRewards.map(r => ({
          slug: r.slug,
          title: r.title,
          description: r.description,
          type: r.type,
          value: r.value || 0,
          iconUrl: r.iconUrl,
          conditionType: r.conditionType,
          conditionConfig: r.conditionConfig,
          isActive: r.isActive ?? true,
        })),
        documents: allDocuments.map(d => ({
          questSlug: d.questId ? questIdToSlug.get(d.questId) || '' : '',
          title: d.title,
          content: d.content,
          contentType: d.contentType || 'faq',
        })),
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
