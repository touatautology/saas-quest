import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateVerificationToken } from '@/lib/crypto';
import { setToolSettingAsync, ToolSettings } from '@/lib/settings-helper';

// POST: 検証トークンを生成/再生成
export async function POST() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 新しいトークンを生成
    const plainToken = generateVerificationToken();
    const now = new Date();

    // 既存の設定を確認
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    // toolSettingsに書き込み（serverVerificationTokenは自動的に暗号化される）
    let currentToolSettings: ToolSettings = existing.length > 0
      ? (existing[0].toolSettings as ToolSettings || {})
      : {};
    currentToolSettings = await setToolSettingAsync(currentToolSettings, 'serverVerificationToken', plainToken);
    currentToolSettings = await setToolSettingAsync(currentToolSettings, 'serverTokenCreatedAt', now.toISOString());

    if (existing.length > 0) {
      // 更新
      await db
        .update(userSettings)
        .set({
          toolSettings: currentToolSettings,
          updatedAt: now,
        })
        .where(eq(userSettings.userId, user.id));
    } else {
      // 新規作成
      await db.insert(userSettings).values({
        userId: user.id,
        toolSettings: currentToolSettings,
      });
    }

    // 平文トークンを1回だけ返す（この後はマスクされる）
    return Response.json({
      success: true,
      token: plainToken,
      createdAt: now.toISOString(),
      message: 'Token generated successfully. Save this token - it will not be shown again.',
    });
  } catch (error) {
    console.error('Failed to generate verification token:', error);
    return Response.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
