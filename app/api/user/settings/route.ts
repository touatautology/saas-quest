import { db } from '@/lib/db/drizzle';
import { userSettings } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n';
import { getToolSetting, setToolSettingAsync, getMaskedToolSetting, ToolSettings } from '@/lib/settings-helper';

// ユーザー設定を取得
export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1);

  if (settings.length === 0) {
    return Response.json({
      aiChatEnabled: false,
      hasApiKey: false,
      maskedApiKey: null,
      geminiModel: 'gemini-2.5-flash-lite',
      locale: DEFAULT_LOCALE,
      toolSettings: {},
    });
  }

  const setting = settings[0];
  const toolSettingsData = setting.toolSettings as ToolSettings | null;

  // toolSettingsから読み込み
  const aiChatEnabled = getToolSetting(toolSettingsData, 'aiChatEnabled') ?? false;
  const geminiModel = getToolSetting(toolSettingsData, 'geminiModel') ?? 'gemini-2.5-flash-lite';
  const hasApiKey = !!getToolSetting(toolSettingsData, 'geminiApiKey');
  const maskedApiKey = getMaskedToolSetting(toolSettingsData, 'geminiApiKey');

  return Response.json({
    aiChatEnabled,
    hasApiKey,
    maskedApiKey,
    geminiModel,
    locale: setting.locale,
    toolSettings: toolSettingsData || {},
  });
}

// ユーザー設定を更新
export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { geminiApiKey, aiChatEnabled, geminiModel, locale, toolSettings } = body;

  // APIキーの検証（設定されている場合）
  if (geminiApiKey) {
    const isValid = await validateGeminiApiKey(geminiApiKey);
    if (!isValid) {
      return Response.json(
        { error: 'Invalid API key', message: 'Gemini APIキーが無効です。正しいキーを入力してください。' },
        { status: 400 }
      );
    }
  }

  // locale検証
  if (locale !== undefined && !isValidLocale(locale)) {
    return Response.json(
      { error: 'Invalid locale', message: '無効な言語設定です。' },
      { status: 400 }
    );
  }

  // 既存の設定を確認
  const existingSettings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1);

  // 既存のtoolSettingsを取得
  let currentToolSettings: ToolSettings = existingSettings.length > 0
    ? (existingSettings[0].toolSettings as ToolSettings || {})
    : {};

  // toolSettingsに書き込み（非同期版: DBから暗号化対象キーを取得）
  if (geminiApiKey !== undefined) {
    currentToolSettings = await setToolSettingAsync(currentToolSettings, 'geminiApiKey', geminiApiKey || null);
  }
  if (aiChatEnabled !== undefined) {
    currentToolSettings = await setToolSettingAsync(currentToolSettings, 'aiChatEnabled', aiChatEnabled);
  }
  if (geminiModel !== undefined) {
    currentToolSettings = await setToolSettingAsync(currentToolSettings, 'geminiModel', geminiModel);
  }

  // 直接渡されたtoolSettingsもマージ
  if (toolSettings !== undefined) {
    for (const [key, value] of Object.entries(toolSettings)) {
      currentToolSettings = await setToolSettingAsync(currentToolSettings, key, value as string | boolean | number | null);
    }
  }

  const updateData: Partial<{
    locale: string;
    toolSettings: ToolSettings;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
    toolSettings: currentToolSettings,
  };

  if (locale !== undefined) {
    updateData.locale = locale;
  }

  if (existingSettings.length > 0) {
    await db
      .update(userSettings)
      .set(updateData)
      .where(eq(userSettings.userId, user.id));
  } else {
    await db.insert(userSettings).values({
      userId: user.id,
      locale: locale ?? DEFAULT_LOCALE,
      toolSettings: currentToolSettings,
    });
  }

  return Response.json({ success: true, message: '設定を保存しました' });
}

// Gemini APIキーの有効性を検証
async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    // Gemini APIの簡単なテスト呼び出し
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    return response.ok;
  } catch {
    return false;
  }
}
