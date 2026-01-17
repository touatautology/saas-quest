import { getAdminUser } from '@/lib/admin/queries';
import { translateText } from '@/lib/ai/gemini';
import { db } from '@/lib/db/drizzle';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { text, targetLang, sourceLang } = body;

  if (!text || !targetLang) {
    return Response.json(
      { error: 'text and targetLang are required' },
      { status: 400 }
    );
  }

  try {
    // AdminのGemini APIキーを取得
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, admin.id))
      .limit(1);

    if (settings.length === 0 || !settings[0].geminiApiKeyEncrypted) {
      return Response.json(
        { error: 'Gemini API key not configured. Please set it in Settings.' },
        { status: 400 }
      );
    }

    const apiKey = decrypt(settings[0].geminiApiKeyEncrypted);
    const modelName = settings[0].geminiModel || 'gemini-2.5-flash-lite';

    const translated = await translateText(
      apiKey,
      text,
      targetLang,
      sourceLang,
      modelName
    );

    return Response.json({ translated });
  } catch (error) {
    console.error('Translation error:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
