import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getToolSetting, setToolSettingAsync, hasToolSetting, ToolSettings } from '@/lib/settings-helper';

// GET: サーバー設定を取得
export async function GET() {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    if (settings.length === 0) {
      return Response.json({
        serverUrl: null,
        hasToken: false,
        tokenCreatedAt: null,
      });
    }

    const setting = settings[0];
    const toolSettingsData = setting.toolSettings as ToolSettings | null;

    // toolSettingsから読み込み
    const serverUrl = getToolSetting(toolSettingsData, 'serverUrl') ?? null;
    const hasToken = hasToolSetting(toolSettingsData, 'serverVerificationToken');
    const tokenCreatedAtValue = getToolSetting(toolSettingsData, 'serverTokenCreatedAt');
    const tokenCreatedAt = tokenCreatedAtValue
      ? new Date(tokenCreatedAtValue as string).toISOString()
      : null;

    return Response.json({
      serverUrl,
      hasToken,
      tokenCreatedAt,
    });
  } catch (error) {
    console.error('Failed to get server config:', error);
    return Response.json(
      { error: 'Failed to get server config' },
      { status: 500 }
    );
  }
}

// PUT: サーバーURLを更新
export async function PUT(request: Request) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serverUrl } = body;

    // URLバリデーション + SSRF対策
    if (serverUrl) {
      const urlValidation = validateServerUrl(serverUrl);
      if (!urlValidation.isValid) {
        return Response.json(
          { error: urlValidation.message },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // 既存の設定を確認
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    // toolSettingsに書き込み（非同期版: DBから暗号化対象キーを取得）
    let currentToolSettings: ToolSettings = existing.length > 0
      ? (existing[0].toolSettings as ToolSettings || {})
      : {};
    currentToolSettings = await setToolSettingAsync(currentToolSettings, 'serverUrl', serverUrl || null);

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

    return Response.json({
      success: true,
      serverUrl: serverUrl || null,
      message: 'Server URL updated successfully',
    });
  } catch (error) {
    console.error('Failed to update server config:', error);
    return Response.json(
      { error: 'Failed to update server config' },
      { status: 500 }
    );
  }
}

// POST: サーバー接続テスト
export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serverUrl } = body;

    if (!serverUrl) {
      return Response.json(
        { error: 'Server URL is required' },
        { status: 400 }
      );
    }

    // セキュリティ: SSRF対策 - プライベートIPアドレスをブロック（localhostは開発用に許可）
    const ssrfCheck = validateServerUrl(serverUrl);
    if (!ssrfCheck.isValid) {
      return Response.json(
        { error: ssrfCheck.message },
        { status: 400 }
      );
    }

    // 基本的な接続テスト（GETリクエスト）
    const testUrl = new URL('/api/saas-quest/status', serverUrl);

    try {
      const response = await fetch(testUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10秒タイムアウト
      });

      if (response.ok) {
        return Response.json({
          success: true,
          message: 'Server is reachable',
          status: response.status,
        });
      } else {
        return Response.json({
          success: false,
          message: `Server responded with status ${response.status}`,
          status: response.status,
        });
      }
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      return Response.json({
        success: false,
        message: `Failed to connect: ${errorMessage}`,
      });
    }
  } catch (error) {
    console.error('Failed to test server connection:', error);
    return Response.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}

// セキュリティ: SSRF対策 - サーバーURLの検証
// localhost/127.0.0.1は開発用に許可、他のプライベートIPはブロック
function validateServerUrl(urlString: string): { isValid: boolean; message: string } {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    // IPv6ブラケットを除去し、ゾーンID（%）も除去
    const normalizedHost = hostname.replace(/^\[|\]$/g, '').split('%')[0];

    // プロトコルチェック（HTTPSまたはlocalhost向けHTTP）
    const isLocalhost =
      normalizedHost === 'localhost' ||
      normalizedHost === '127.0.0.1' ||
      normalizedHost === '::1';
    if (url.protocol !== 'https:' && !isLocalhost) {
      return { isValid: false, message: 'Server URL must use HTTPS (except for localhost)' };
    }

    // プライベートIPアドレス範囲をブロック（localhost/127.0.0.1以外）
    if (isPrivateIpv4(normalizedHost, isLocalhost)) {
      return { isValid: false, message: 'Private IP addresses are not allowed' };
    }

    if (isPrivateIpv6(normalizedHost, isLocalhost)) {
      return { isValid: false, message: 'Private IPv6 addresses are not allowed' };
    }

    // 内部ドメインパターンをブロック
    if (
      normalizedHost.endsWith('.local') ||
      normalizedHost.endsWith('.internal') ||
      normalizedHost.endsWith('.corp') ||
      normalizedHost.endsWith('.lan')
    ) {
      return { isValid: false, message: 'Internal domain names are not allowed' };
    }

    return { isValid: true, message: 'OK' };
  } catch {
    return { isValid: false, message: 'Invalid URL format' };
  }
}

function isPrivateIpv4(hostname: string, isLocalhost: boolean): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Pattern);
  if (!ipMatch) return false;

  const [, a, b, c, d] = ipMatch.map(Number);
  if ([a, b, c, d].some((octet) => octet > 255)) return true;

  if (a === 127) {
    return !isLocalhost || hostname !== '127.0.0.1';
  }

  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIpv6(hostname: string, isLocalhost: boolean): boolean {
  if (!hostname.includes(':')) return false;

  const base = hostname.split('%')[0];
  if (base === '::1') return !isLocalhost;

  const normalized = base.toLowerCase();
  return (
    normalized.startsWith('fd') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fe80')
  );
}
