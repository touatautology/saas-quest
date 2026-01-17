import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';
import {
  books,
  chapters,
  quests,
  rewards,
  questDocuments,
  chatMessages,
  chatSessions,
  userQuestProgress,
  type RewardConditionConfig,
} from '@/lib/db/schema';
import type { ExportData } from '../export/route';

export async function POST(request: NextRequest) {
  try {
    const importData: ExportData = await request.json();

    // バージョンチェック
    if (!importData.version || !importData.data) {
      return NextResponse.json(
        { error: 'Invalid import data format' },
        { status: 400 }
      );
    }

    // 既存データを削除（外部キー制約順）
    console.log('Clearing existing data...');
    await db.delete(chatMessages);
    await db.delete(chatSessions);
    await db.delete(userQuestProgress);
    await db.delete(questDocuments);
    await db.delete(quests);
    await db.delete(chapters);
    await db.delete(books);
    await db.delete(rewards);

    // ブックをインポート
    const bookSlugToId = new Map<string, number>();
    if (importData.data.books && importData.data.books.length > 0) {
      for (const book of importData.data.books) {
        const [inserted] = await db.insert(books).values({
          slug: book.slug,
          title: book.title,
          description: book.description,
          order: book.order,
        }).returning();
        bookSlugToId.set(book.slug, inserted.id);
      }
      console.log(`Imported ${importData.data.books.length} books`);
    }

    // チャプターをインポート
    const chapterSlugToId = new Map<string, number>();
    if (importData.data.chapters && importData.data.chapters.length > 0) {
      for (const chapter of importData.data.chapters) {
        const [inserted] = await db.insert(chapters).values({
          slug: chapter.slug,
          title: chapter.title,
          description: chapter.description,
          bookId: chapter.bookSlug ? bookSlugToId.get(chapter.bookSlug) || null : null,
          order: chapter.order,
        }).returning();
        chapterSlugToId.set(chapter.slug, inserted.id);
      }
      console.log(`Imported ${importData.data.chapters.length} chapters`);
    }

    // クエストをインポート（前提条件なしで最初にインポート）
    const questSlugToId = new Map<string, number>();
    const questsWithPrerequisites: Array<{ slug: string; prerequisiteSlug: string }> = [];

    if (importData.data.quests && importData.data.quests.length > 0) {
      for (const quest of importData.data.quests) {
        const chapterId = chapterSlugToId.get(quest.chapterSlug);
        if (!chapterId) {
          console.warn(`Chapter not found for quest ${quest.slug}: ${quest.chapterSlug}`);
          continue;
        }

        const [inserted] = await db.insert(quests).values({
          slug: quest.slug,
          title: quest.title,
          description: quest.description,
          chapterId,
          order: quest.order,
          category: quest.category,
          verificationType: quest.verificationType,
          prerequisiteQuestId: null, // 後で更新
        }).returning();
        questSlugToId.set(quest.slug, inserted.id);

        if (quest.prerequisiteQuestSlug) {
          questsWithPrerequisites.push({
            slug: quest.slug,
            prerequisiteSlug: quest.prerequisiteQuestSlug,
          });
        }
      }

      // 前提条件を更新
      for (const { slug, prerequisiteSlug } of questsWithPrerequisites) {
        const questId = questSlugToId.get(slug);
        const prerequisiteId = questSlugToId.get(prerequisiteSlug);
        if (questId && prerequisiteId) {
          await db.update(quests)
            .set({ prerequisiteQuestId: prerequisiteId })
            .where(eq(quests.id, questId));
        }
      }
      console.log(`Imported ${importData.data.quests.length} quests`);
    }

    // リワードをインポート
    if (importData.data.rewards && importData.data.rewards.length > 0) {
      for (const reward of importData.data.rewards) {
        await db.insert(rewards).values({
          slug: reward.slug,
          title: reward.title,
          description: reward.description,
          type: reward.type,
          value: reward.value,
          iconUrl: reward.iconUrl,
          conditionType: reward.conditionType,
          conditionConfig: reward.conditionConfig as RewardConditionConfig,
          isActive: reward.isActive,
        });
      }
      console.log(`Imported ${importData.data.rewards.length} rewards`);
    }

    // ドキュメントをインポート（embeddingなし）
    if (importData.data.documents && importData.data.documents.length > 0) {
      for (const doc of importData.data.documents) {
        const questId = questSlugToId.get(doc.questSlug);
        if (!questId) {
          console.warn(`Quest not found for document: ${doc.questSlug}`);
          continue;
        }

        await db.insert(questDocuments).values({
          questId,
          title: doc.title,
          content: doc.content,
          contentType: doc.contentType || 'faq',
          // embeddingは後で再生成が必要
        });
      }
      console.log(`Imported ${importData.data.documents.length} documents (embeddings need regeneration)`);
    }

    return NextResponse.json({
      success: true,
      imported: {
        books: importData.data.books?.length || 0,
        chapters: importData.data.chapters?.length || 0,
        quests: importData.data.quests?.length || 0,
        rewards: importData.data.rewards?.length || 0,
        documents: importData.data.documents?.length || 0,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data', details: String(error) },
      { status: 500 }
    );
  }
}
