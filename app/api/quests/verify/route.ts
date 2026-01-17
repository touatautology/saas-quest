import { db } from '@/lib/db/drizzle';
import { userQuestProgress, quests, userSettings, QuestVerificationConfig } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';
import { checkAndGrantRewards } from '@/lib/rewards/check-rewards';
import {
  decrypt,
  generateHmacSignature,
  verifyHmacSignature,
  buildSignaturePayload,
  buildResponseSignaturePayload,
  generateNonce,
} from '@/lib/crypto';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { questSlug, data } = body;
  // セキュリティ: verificationTypeはリクエストから受け取らず、クエスト定義を使用

  // クエストを取得
  const quest = await db
    .select()
    .from(quests)
    .where(eq(quests.slug, questSlug))
    .limit(1);

  if (quest.length === 0) {
    return Response.json({ error: 'Quest not found' }, { status: 404 });
  }

  const questData = quest[0];

  // セキュリティ: 検証タイプはクエスト定義から取得（リクエストを信頼しない）
  const verificationType = questData.verificationType;
  if (!verificationType) {
    return Response.json({ error: 'Quest has no verification type configured' }, { status: 400 });
  }

  // 検証タイプに応じた処理
  let isValid = false;
  let message = '';

  switch (verificationType) {
    case 'api_key':
      // Stripe APIキーの検証
      const result = await verifyStripeApiKey(data.apiKey);
      isValid = result.isValid;
      message = result.message;
      break;

    case 'stripe_product':
      // Stripe商品の検証
      const productResult = await verifyStripeProduct(data.apiKey);
      isValid = productResult.isValid;
      message = productResult.message;
      break;

    case 'manual':
      // 手動確認（ユーザーの自己申告）
      isValid = data.confirmed === true;
      message = isValid ? 'クエスト完了！' : '確認が必要です';
      break;

    case 'webhook':
      // n8n Webhook URLの検証
      const webhookResult = await verifyWebhook(data.webhookUrl);
      isValid = webhookResult.isValid;
      message = webhookResult.message;
      break;

    case 'server_status':
      // ユーザーサーバーのステータス検証
      // セキュリティ: 検証条件はクエスト定義からのみ取得（リクエストからの上書きを禁止）
      const verificationConfig = questData.verificationConfig as QuestVerificationConfig | null;
      const requiredFields = verificationConfig?.requiredFields || [];
      const serverResult = await verifyServerStatus(user.id, requiredFields);
      isValid = serverResult.isValid;
      message = serverResult.message;
      break;

    default:
      return Response.json({ error: 'Unknown verification type' }, { status: 400 });
  }

  if (isValid) {
    // セキュリティ: 前提クエストの完了を検証
    if (questData.prerequisiteQuestId) {
      const prerequisiteProgress = await db
        .select()
        .from(userQuestProgress)
        .where(
          and(
            eq(userQuestProgress.userId, user.id),
            eq(userQuestProgress.questId, questData.prerequisiteQuestId),
            eq(userQuestProgress.status, 'completed')
          )
        )
        .limit(1);

      if (prerequisiteProgress.length === 0) {
        return Response.json({
          success: false,
          message: '前提クエストが完了していません。先に前提クエストを完了してください。',
        });
      }
    }

    // 進捗を更新または作成
    const existingProgress = await db
      .select()
      .from(userQuestProgress)
      .where(
        and(
          eq(userQuestProgress.userId, user.id),
          eq(userQuestProgress.questId, questData.id)
        )
      )
      .limit(1);

    // セキュリティ: metadata から機密情報を除外
    const sanitizedMetadata = sanitizeMetadata(data, verificationType);

    if (existingProgress.length > 0) {
      await db
        .update(userQuestProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          metadata: sanitizedMetadata,
        })
        .where(eq(userQuestProgress.id, existingProgress[0].id));
    } else {
      await db.insert(userQuestProgress).values({
        userId: user.id,
        questId: questData.id,
        status: 'completed',
        completedAt: new Date(),
        metadata: sanitizedMetadata,
      });
    }

    // クエスト完了後にリワードをチェック
    const grantedRewards = await checkAndGrantRewards(user.id);

    return Response.json({
      success: true,
      message,
      rewards: grantedRewards.map(r => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        type: r.type,
        value: r.value,
      })),
    });
  }

  return Response.json({ success: isValid, message });
}

async function verifyStripeApiKey(apiKey: string): Promise<{ isValid: boolean; message: string }> {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return { isValid: false, message: 'APIキーはsk_で始まる必要があります' };
  }

  try {
    const stripe = new Stripe(apiKey);
    // アカウント情報を取得して検証
    const account = await stripe.accounts.retrieve();
    return {
      isValid: true,
      message: `Stripe接続成功！アカウント: ${account.email || account.id}`,
    };
  } catch (error) {
    return { isValid: false, message: 'APIキーが無効です。正しいキーを入力してください。' };
  }
}

async function verifyStripeProduct(apiKey: string): Promise<{ isValid: boolean; message: string }> {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return { isValid: false, message: 'APIキーはsk_で始まる必要があります' };
  }

  try {
    const stripe = new Stripe(apiKey);
    const products = await stripe.products.list({ limit: 1, active: true });

    if (products.data.length > 0) {
      return {
        isValid: true,
        message: `商品が見つかりました: ${products.data[0].name}`,
      };
    } else {
      return { isValid: false, message: '有効な商品が見つかりません。Stripeダッシュボードで商品を作成してください。' };
    }
  } catch (error) {
    return { isValid: false, message: 'APIキーが無効です。' };
  }
}

async function verifyWebhook(webhookUrl: string): Promise<{ isValid: boolean; message: string }> {
  if (!webhookUrl) {
    return { isValid: false, message: 'Webhook URLを入力してください' };
  }

  // セキュリティ: SSRF対策 - URL検証
  const urlValidation = validateExternalUrl(webhookUrl);
  if (!urlValidation.isValid) {
    return { isValid: false, message: urlValidation.message };
  }

  try {
    // テストペイロードを送信
    const testPayload = {
      type: 'saas_quest.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'SaaS Quest検証テスト',
        test: true,
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      return {
        isValid: true,
        message: `Webhook接続成功！ステータス: ${response.status}`,
      };
    } else {
      return {
        isValid: false,
        message: `Webhookがエラーを返しました（ステータス: ${response.status}）。n8nワークフローが有効になっているか確認してください。`,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: 'Webhookへの接続に失敗しました。URLが正しいか、ワークフローが有効か確認してください。',
    };
  }
}

// ユーザーサーバーのステータス検証
async function verifyServerStatus(
  userId: number,
  requiredFields: string[]
): Promise<{ isValid: boolean; message: string; data?: Record<string, unknown> }> {
  // ユーザーのサーバー設定を取得（toolSettingsから読み込み）
  const settings = await db
    .select({
      toolSettings: userSettings.toolSettings,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (settings.length === 0 || !settings[0].toolSettings) {
    return {
      isValid: false,
      message: 'サーバーURLが設定されていません。設定画面でサーバーURLを登録してください。',
    };
  }

  const toolSettingsData = settings[0].toolSettings as Record<string, unknown>;

  // toolSettingsからサーバー設定を取得
  const serverUrl = toolSettingsData.serverUrl as string | undefined;
  const encryptedToken = toolSettingsData.serverVerificationToken as string | undefined;

  if (!serverUrl) {
    return {
      isValid: false,
      message: 'サーバーURLが設定されていません。設定画面でサーバーURLを登録してください。',
    };
  }

  // セキュリティ: SSRF対策 - サーバーURL検証（localhostは許可）
  const serverUrlValidation = validateServerUrl(serverUrl);
  if (!serverUrlValidation.isValid) {
    return {
      isValid: false,
      message: serverUrlValidation.message,
    };
  }

  if (!encryptedToken) {
    return {
      isValid: false,
      message: '検証トークンが設定されていません。設定画面でトークンを発行してください。',
    };
  }

  // 暗号化されたトークンを復号化（encrypted:プレフィックス付きの場合）
  let token: string;
  if (encryptedToken.startsWith('encrypted:')) {
    try {
      token = decrypt(encryptedToken.slice('encrypted:'.length));
    } catch {
      return {
        isValid: false,
        message: 'トークンの復号化に失敗しました。トークンを再発行してください。',
      };
    }
  } else {
    // 旧形式（暗号化プレフィックスなし）の場合
    try {
      token = decrypt(encryptedToken);
    } catch {
      return {
        isValid: false,
        message: 'トークンの復号化に失敗しました。トークンを再発行してください。',
      };
    }
  }

  // リクエスト準備
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const requestBody = {
    action: 'verify_status',
    timestamp,
    nonce,
  };

  // 署名生成
  const payload = buildSignaturePayload(timestamp, nonce, requestBody);
  const signature = generateHmacSignature(payload, token);

  try {
    // ユーザーサーバーにリクエスト
    const statusUrl = new URL('/api/saas-quest/status', serverUrl);
    const response = await fetch(statusUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SaaS-Quest-Signature': signature,
        'X-SaaS-Quest-Timestamp': timestamp.toString(),
        'X-SaaS-Quest-Nonce': nonce,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000), // 15秒タイムアウト
    });

    if (!response.ok) {
      return {
        isValid: false,
        message: `サーバーがエラーを返しました（ステータス: ${response.status}）`,
      };
    }

    const responseData = await response.json();

    // レスポンス署名を検証
    if (!responseData.signature || !responseData.timestamp || !responseData.data) {
      return {
        isValid: false,
        message: 'サーバーからの応答形式が不正です。テンプレートコードを確認してください。',
      };
    }

    // タイムスタンプ検証（5分以内）
    const responseTimestamp = responseData.timestamp;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - responseTimestamp) > 300) {
      return {
        isValid: false,
        message: 'サーバーの応答タイムスタンプが古すぎます。',
      };
    }

    // 署名検証
    const responsePayload = buildResponseSignaturePayload(responseTimestamp, responseData.data);
    if (!verifyHmacSignature(responsePayload, responseData.signature, token)) {
      return {
        isValid: false,
        message: '署名検証に失敗しました。トークンが正しく設定されているか確認してください。',
      };
    }

    // 必須フィールドのチェック
    const serverData = responseData.data as Record<string, unknown>;
    const missingFields: string[] = [];
    const falseFields: string[] = [];

    for (const field of requiredFields) {
      if (!(field in serverData)) {
        missingFields.push(field);
      } else if (serverData[field] === false) {
        falseFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `必要なフィールドがありません: ${missingFields.join(', ')}`,
        data: serverData,
      };
    }

    if (falseFields.length > 0) {
      return {
        isValid: false,
        message: `以下の設定が完了していません: ${falseFields.join(', ')}`,
        data: serverData,
      };
    }

    return {
      isValid: true,
      message: 'サーバー検証成功！すべての設定が確認されました。',
      data: serverData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      isValid: false,
      message: `サーバーへの接続に失敗しました: ${errorMessage}`,
    };
  }
}

// セキュリティ: SSRF対策 - 外部URLの検証
// 内部IPアドレスやローカルホストへのアクセスをブロック
function validateExternalUrl(urlString: string): { isValid: boolean; message: string } {
  try {
    const url = new URL(urlString);

    // HTTPSのみ許可
    if (url.protocol !== 'https:') {
      return { isValid: false, message: 'URLはhttps://で始まる必要があります' };
    }

    const hostname = url.hostname.toLowerCase();
    // IPv6ブラケットを除去し、ゾーンID（%）も除去
    const normalizedHost = hostname.replace(/^\[|\]$/g, '').split('%')[0];

    // ローカルホストをブロック
    if (
      normalizedHost === 'localhost' ||
      normalizedHost === '127.0.0.1' ||
      normalizedHost === '0.0.0.0' ||
      normalizedHost === '::1' ||
      normalizedHost.endsWith('.localhost')
    ) {
      return { isValid: false, message: 'ローカルホストへのアクセスは許可されていません' };
    }

    // プライベートIPアドレス範囲をブロック
    // IPv4: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
    if (isPrivateIpv4(normalizedHost, false)) {
      return { isValid: false, message: 'プライベートIPアドレスへのアクセスは許可されていません' };
    }

    if (isPrivateIpv6(normalizedHost, false)) {
      return { isValid: false, message: 'プライベートIPv6アドレスへのアクセスは許可されていません' };
    }

    // 内部ドメインパターンをブロック
    if (
      normalizedHost.endsWith('.local') ||
      normalizedHost.endsWith('.internal') ||
      normalizedHost.endsWith('.corp') ||
      normalizedHost.endsWith('.lan')
    ) {
      return { isValid: false, message: '内部ドメインへのアクセスは許可されていません' };
    }

    return { isValid: true, message: 'OK' };
  } catch {
    return { isValid: false, message: '無効なURL形式です' };
  }
}

// セキュリティ: SSRF対策 - サーバーURL検証（localhostは開発用に許可）
function validateServerUrl(urlString: string): { isValid: boolean; message: string } {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    // IPv6ブラケットを除去し、ゾーンID（%）も除去
    const normalizedHost = hostname.replace(/^\[|\]$/g, '').split('%')[0];
    const isLocalhost =
      normalizedHost === 'localhost' ||
      normalizedHost === '127.0.0.1' ||
      normalizedHost === '::1';

    // プロトコルチェック（HTTPSまたはlocalhost向けHTTP）
    if (url.protocol !== 'https:' && !isLocalhost) {
      return { isValid: false, message: 'Server URL must use HTTPS (except for localhost)' };
    }

    if (isPrivateIpv4(normalizedHost, isLocalhost)) {
      return { isValid: false, message: 'Private IP addresses are not allowed' };
    }

    if (isPrivateIpv6(normalizedHost, isLocalhost)) {
      return { isValid: false, message: 'Private IPv6 addresses are not allowed' };
    }

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

// セキュリティ: metadata から機密情報を除外
// APIキー、トークン、パスワードなどは保存しない
function sanitizeMetadata(
  data: Record<string, unknown>,
  verificationType: string
): Record<string, unknown> {
  // 除外するキーのパターン
  const sensitiveKeys = [
    'apiKey',
    'api_key',
    'apikey',
    'token',
    'password',
    'secret',
    'credential',
    'key',
  ];

  const sanitized: Record<string, unknown> = {
    verificationType,
    verifiedAt: new Date().toISOString(),
  };

  // 安全なメタデータのみ保存
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(
      (pattern) => lowerKey.includes(pattern)
    );

    if (!isSensitive) {
      // URL はドメインのみ保存（パスやクエリは除外）
      if (lowerKey.includes('url') && typeof value === 'string') {
        try {
          const url = new URL(value);
          sanitized[key] = url.origin;
        } catch {
          // URLパース失敗時は保存しない
        }
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        // boolean と number は安全
        sanitized[key] = value;
      }
      // 文字列は機密情報の可能性があるため、明示的に許可されたもの以外は除外
    }
  }

  return sanitized;
}
