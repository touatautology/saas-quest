import { db } from '@/lib/db/drizzle';
import { questDocuments, quests } from '@/lib/db/schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { generateEmbedding } from './gemini';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

// 類似ドキュメントを検索
export async function searchSimilarDocuments(
  apiKey: string,
  questId: number,
  query: string,
  limit: number = 3
): Promise<
  {
    id: number;
    title: string;
    content: string;
    contentType: string;
    similarity: number;
  }[]
> {
  // まず該当クエストにドキュメントがあるか確認
  const docCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(questDocuments)
    .where(
      and(
        eq(questDocuments.questId, questId),
        isNotNull(questDocuments.embedding)
      )
    );

  if (!docCount[0] || docCount[0].count === 0) {
    // ドキュメントがない場合は空配列を返す（embedding生成をスキップ）
    return [];
  }

  // クエリの埋め込みベクトルを生成
  const queryEmbedding = await generateEmbedding(apiKey, query);

  // ベクトルを文字列形式に変換（pgvector用: '[1,2,3,...]'）
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // pgvectorで類似検索
  // cosine距離で検索（1 - cosine_distance = similarity）
  // sql.rawを使用してベクトル文字列を直接埋め込む
  const results = await db
    .select({
      id: questDocuments.id,
      title: questDocuments.title,
      content: questDocuments.content,
      contentType: questDocuments.contentType,
      similarity: sql<number>`1 - (${questDocuments.embedding} <=> '${sql.raw(vectorString)}'::vector)`,
    })
    .from(questDocuments)
    .where(
      and(
        eq(questDocuments.questId, questId),
        isNotNull(questDocuments.embedding)
      )
    )
    .orderBy(
      sql`${questDocuments.embedding} <=> '${sql.raw(vectorString)}'::vector`
    )
    .limit(limit);

  // JSONB型を文字列に変換（英語をデフォルトとして使用）
  return results.map((doc) => ({
    id: doc.id,
    title: getLocalizedText(doc.title as LocalizedText, 'en'),
    content: getLocalizedText(doc.content as LocalizedText, 'en'),
    contentType: doc.contentType,
    similarity: doc.similarity,
  }));
}

// クエスト情報を取得
export async function getQuestInfo(questId: number) {
  const quest = await db
    .select({
      id: quests.id,
      slug: quests.slug,
      title: quests.title,
      description: quests.description,
      category: quests.category,
    })
    .from(quests)
    .where(eq(quests.id, questId))
    .limit(1);

  return quest[0] || null;
}

// RAGコンテキストを構築
export async function buildRAGContext(
  apiKey: string,
  questId: number,
  query: string
): Promise<{
  context: string;
  sources: { id: number; title: string }[];
}> {
  // クエスト情報を取得
  const questInfo = await getQuestInfo(questId);

  // コンテキストを構築
  const contextParts: string[] = [];

  // クエスト情報を追加（英語テキストを使用）
  if (questInfo) {
    const questTitle = getLocalizedText(questInfo.title as LocalizedText, 'en');
    const questDescription = getLocalizedText(questInfo.description as LocalizedText | null, 'en');
    contextParts.push(
      `## 現在のクエスト: ${questTitle}\n${questDescription}`
    );
  }

  // 類似ドキュメントを検索（ドキュメントがない場合はスキップ）
  let relevantDocs: { id: number; title: string; content: string; similarity: number }[] = [];
  try {
    const documents = await searchSimilarDocuments(apiKey, questId, query);
    // 関連ドキュメントを追加（類似度が0.3以上のもの）
    relevantDocs = documents.filter((doc) => doc.similarity > 0.3);
    if (relevantDocs.length > 0) {
      contextParts.push('\n## 関連するFAQ・ガイド:');
      for (const doc of relevantDocs) {
        contextParts.push(`\n### ${doc.title}\n${doc.content}`);
      }
    }
  } catch (error) {
    // ドキュメント検索でエラーが発生しても続行（コンテキストなしでAIを呼び出す）
    console.error('RAG search error (continuing without context):', error);
  }

  return {
    context: contextParts.join('\n'),
    sources: relevantDocs.map((doc) => ({ id: doc.id, title: doc.title })),
  };
}

// ドキュメントに埋め込みベクトルを追加
export async function addEmbeddingToDocument(
  apiKey: string,
  documentId: number
): Promise<void> {
  // ドキュメントを取得
  const doc = await db
    .select()
    .from(questDocuments)
    .where(eq(questDocuments.id, documentId))
    .limit(1);

  if (doc.length === 0) {
    throw new Error('Document not found');
  }

  // 埋め込みを生成（英語テキストを使用）
  const titleText = getLocalizedText(doc[0].title as LocalizedText, 'en');
  const contentText = getLocalizedText(doc[0].content as LocalizedText, 'en');
  const textToEmbed = `${titleText}\n${contentText}`;
  const embedding = await generateEmbedding(apiKey, textToEmbed);

  // DBを更新
  await db
    .update(questDocuments)
    .set({
      embedding: embedding,
      updatedAt: new Date(),
    })
    .where(eq(questDocuments.id, documentId));
}
