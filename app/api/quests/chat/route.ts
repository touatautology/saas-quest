import { db } from '@/lib/db/drizzle';
import { chatSessions, chatMessages, userSettings } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import { buildRAGContext } from '@/lib/ai/rag';
import { generateChatResponse, SAAS_QUEST_SYSTEM_PROMPT } from '@/lib/ai/gemini';

// チャットメッセージを送信
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { questId, sessionId, message } = body;

  if (!questId || !message) {
    return Response.json(
      { error: 'questId and message are required' },
      { status: 400 }
    );
  }

  // ユーザー設定からAPIキーを取得
  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1);

  if (
    settings.length === 0 ||
    !settings[0].geminiApiKeyEncrypted ||
    !settings[0].aiChatEnabled
  ) {
    return Response.json(
      {
        error: 'API_KEY_NOT_SET',
        message:
          'AIチャットを利用するには設定画面でGemini APIキーを登録してください',
      },
      { status: 400 }
    );
  }

  const apiKey = decrypt(settings[0].geminiApiKeyEncrypted);
  const geminiModel = settings[0].geminiModel || 'gemini-2.5-flash-lite';

  // セッションを取得または作成
  let currentSessionId = sessionId;

  if (!currentSessionId) {
    // 新しいセッションを作成
    const newSession = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
        questId: questId,
      })
      .returning();

    currentSessionId = newSession[0].id;
  } else {
    // セッションの所有権を確認
    const existingSession = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, currentSessionId),
          eq(chatSessions.userId, user.id)
        )
      )
      .limit(1);

    if (existingSession.length === 0) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
  }

  // ユーザーメッセージを保存
  await db.insert(chatMessages).values({
    sessionId: currentSessionId,
    role: 'user',
    content: message,
  });

  try {
    // RAGコンテキストを構築
    const { context, sources } = await buildRAGContext(apiKey, questId, message);

    // チャット履歴を取得（直近10件）
    const history = await db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, currentSessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(10);

    // 履歴を時系列順に並べ替え（新しいユーザーメッセージを除く）
    const chatHistory = history
      .reverse()
      .slice(0, -1) // 今追加したユーザーメッセージを除く
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content,
      })) as { role: 'user' | 'model'; content: string }[];

    // AI応答を生成
    const aiResponse = await generateChatResponse(
      apiKey,
      SAAS_QUEST_SYSTEM_PROMPT,
      context,
      message,
      chatHistory,
      geminiModel
    );

    // AI応答を保存
    const savedMessage = await db
      .insert(chatMessages)
      .values({
        sessionId: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        sources: sources.length > 0 ? sources : null,
      })
      .returning();

    // セッションの更新日時を更新
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, currentSessionId));

    return Response.json({
      sessionId: currentSessionId,
      message: {
        id: savedMessage[0].id,
        role: 'assistant',
        content: aiResponse,
        sources: sources,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error details:', { errorMessage, errorStack });

    // APIキーエラーの場合
    if (errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
      return Response.json(
        {
          error: 'INVALID_API_KEY',
          message:
            'APIキーが無効です。設定画面で正しいキーを登録してください。',
        },
        { status: 400 }
      );
    }

    // Gemini APIのレート制限エラー
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate')) {
      return Response.json(
        {
          error: 'RATE_LIMIT',
          message: 'APIのレート制限に達しました。しばらく待ってから再試行してください。',
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        error: 'CHAT_ERROR',
        message: 'チャット処理中にエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// チャット履歴を取得
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const questId = searchParams.get('questId');

  if (!questId) {
    return Response.json({ error: 'questId is required' }, { status: 400 });
  }

  // このクエストの最新セッションを取得
  const session = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, user.id),
        eq(chatSessions.questId, parseInt(questId))
      )
    )
    .orderBy(desc(chatSessions.updatedAt))
    .limit(1);

  if (session.length === 0) {
    return Response.json({ sessionId: null, messages: [] });
  }

  // メッセージを取得
  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      sources: chatMessages.sources,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session[0].id))
    .orderBy(chatMessages.createdAt);

  return Response.json({
    sessionId: session[0].id,
    messages: messages,
  });
}
