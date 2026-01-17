import {
  getAdminUser,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  clearDocumentEmbedding,
} from '@/lib/admin/queries';
import { addEmbeddingToDocument } from '@/lib/ai/rag';
import { db } from '@/lib/db/drizzle';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const chapterId = searchParams.get('chapterId');
  const questId = searchParams.get('questId');

  const filter: { bookId?: number; chapterId?: number; questId?: number } = {};
  if (bookId) filter.bookId = parseInt(bookId);
  if (chapterId) filter.chapterId = parseInt(chapterId);
  if (questId) filter.questId = parseInt(questId);

  const documents = await getDocuments(Object.keys(filter).length > 0 ? filter : undefined);
  return Response.json({ documents });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { bookId, chapterId, questId, title, content, contentType, generateEmbedding } = body;

  // bookId, chapterId, questIdのいずれか1つは必須
  if (!bookId && !chapterId && !questId) {
    return Response.json(
      { error: 'At least one of bookId, chapterId, or questId is required' },
      { status: 400 }
    );
  }

  if (!title || !content || !contentType) {
    return Response.json(
      { error: 'title, content, and contentType are required' },
      { status: 400 }
    );
  }

  try {
    const document = await createDocument({
      bookId: bookId || null,
      chapterId: chapterId || null,
      questId: questId || null,
      title,
      content,
      contentType,
    });

    // embeddingを生成する場合
    if (generateEmbedding) {
      const apiKey = await getAdminGeminiApiKey(admin.id);
      if (apiKey) {
        await addEmbeddingToDocument(apiKey, document.id);
      }
    }

    return Response.json({ success: true, document });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, action, ...data } = body;

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    // embedding再生成の場合
    if (action === 'regenerate-embedding') {
      const apiKey = await getAdminGeminiApiKey(admin.id);
      if (!apiKey) {
        return Response.json(
          { error: 'Gemini API key not configured' },
          { status: 400 }
        );
      }
      await addEmbeddingToDocument(apiKey, id);
      return Response.json({ success: true, message: 'Embedding regenerated successfully' });
    }

    // 通常の更新
    await updateDocument(id, data);

    // contentが変更された場合、embeddingをクリア
    if (data.content) {
      await clearDocumentEmbedding(id);
    }

    return Response.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update document';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteDocument(parseInt(id));
  return Response.json({ success: true, message: 'Document deleted successfully' });
}

// AdminのGemini APIキーを取得
async function getAdminGeminiApiKey(userId: number): Promise<string | null> {
  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (settings.length === 0 || !settings[0].geminiApiKeyEncrypted) {
    return null;
  }

  return decrypt(settings[0].geminiApiKeyEncrypted);
}
