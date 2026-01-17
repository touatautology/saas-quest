import { db } from './drizzle';
import { questDocuments, quests } from './schema';
import { eq, sql } from 'drizzle-orm';
import { generateEmbedding } from '../ai/gemini';

// 初期ドキュメントデータ（多言語対応）
const initialDocuments = [
  // Stripeアカウント作成クエスト用
  {
    questSlug: 'stripe-account',
    documents: [
      {
        title: { en: 'How to Create a Stripe Account', ja: 'Stripeアカウントの作成方法' },
        content: { en: `To create a Stripe account, follow these steps:

1. Visit https://dashboard.stripe.com/register
2. Enter your email, name, and password
3. Select your account type (individual or business)
4. Agree to the terms of service and create your account

After creating your account, you can log in to the dashboard.`, ja: `Stripeアカウントを作成するには、以下の手順に従ってください：

1. https://dashboard.stripe.com/register にアクセス
2. メールアドレス、名前、パスワードを入力
3. アカウントの種類を選択（個人または法人）
4. 利用規約に同意してアカウントを作成

アカウント作成後、ダッシュボードにログインできます。` },
        contentType: 'guide',
      },
      {
        title: { en: 'How to Get Your Stripe API Key', ja: 'Stripe APIキーの取得方法' },
        content: { en: `To get your Stripe API Key (Secret Key):

1. Log in to the Stripe dashboard
2. Click "Developers" in the top left
3. Select "API keys"
4. Click "Reveal" for the Secret key
5. Copy the key that starts with sk_test_

Note: Use sk_live_ keys for production, but use sk_test_ for testing.`, ja: `Stripe APIキー（Secret Key）を取得するには：

1. Stripeダッシュボードにログイン
2. 左上の「開発者」または「Developers」をクリック
3. 「APIキー」または「API keys」を選択
4. 「シークレットキー」の「表示」をクリック
5. sk_test_で始まるキーをコピー

注意: 本番環境では sk_live_ で始まるキーを使用しますが、テスト環境では sk_test_ を使用してください。` },
        contentType: 'guide',
      },
      {
        title: { en: 'API Key Shows as Invalid', ja: 'APIキーが無効と表示される' },
        content: { en: `If your API key shows as invalid:

1. Verify the key was copied correctly (watch for leading/trailing spaces)
2. Confirm it starts with sk_test_ or sk_live_
3. Make sure you're using a test environment key
4. Check if the key has been revoked (viewable in dashboard)

If the issue persists, try creating a new API key.`, ja: `APIキーが無効と表示される場合の対処法：

1. キーが正しくコピーされているか確認（前後の空白に注意）
2. sk_test_ または sk_live_ で始まっているか確認
3. テスト環境のキーを使用しているか確認
4. キーが無効化されていないか確認（ダッシュボードで確認可能）

それでも解決しない場合は、新しいAPIキーを作成してみてください。` },
        contentType: 'troubleshoot',
      },
    ],
  },

  // Stripe商品作成クエスト用
  {
    questSlug: 'stripe-product',
    documents: [
      {
        title: { en: 'How to Create a Stripe Product', ja: 'Stripe商品の作成方法' },
        content: { en: `To create a product in Stripe:

1. Log in to the Stripe dashboard
2. Click "Products" in the left menu
3. Click "Add product"
4. Enter the product name (e.g., "Standard Plan")
5. Set the price
   - One-time: Set a fixed price
   - Subscription: Set recurring billing (monthly/yearly)
6. Click "Save product"

The created product can be referenced via the API.`, ja: `Stripeで商品を作成するには：

1. Stripeダッシュボードにログイン
2. 左メニューの「商品」または「Products」をクリック
3. 「商品を追加」をクリック
4. 商品名を入力（例: 「スタンダードプラン」）
5. 価格を設定
   - 一回払い: 固定価格を設定
   - サブスクリプション: 月額/年額などの繰り返し課金を設定
6. 「商品を保存」をクリック

作成した商品はAPIから参照できます。` },
        contentType: 'guide',
      },
      {
        title: { en: 'Product Not Found Error', ja: '商品が見つからないエラー' },
        content: { en: `If you see "Product not found":

1. Verify the product is "Active"
   - Open the product in dashboard and check its status
2. Confirm the product was created in test mode
   - Check if "Test mode" toggle is ON in the top right
3. Verify you're using the correct API key
   - Test mode products are only accessible with test API keys (sk_test_)

After creating a product, try re-verifying with your API key.`, ja: `「商品が見つかりません」と表示される場合：

1. 商品が「有効」になっているか確認
   - ダッシュボードで商品を開き、ステータスを確認
2. テストモードで商品を作成したか確認
   - ダッシュボード右上の「テストモード」がONになっているか確認
3. 正しいAPIキーを使用しているか確認
   - テストモードの商品はテスト用APIキー（sk_test_）でのみ参照可能

商品を作成したら、一度APIキーで再検証してみてください。` },
        contentType: 'troubleshoot',
      },
    ],
  },

  // n8nワークフロー作成クエスト用
  {
    questSlug: 'n8n-setup',
    documents: [
      {
        title: { en: 'How to Register for n8n Cloud', ja: 'n8n Cloudへの登録方法' },
        content: { en: `To register for n8n Cloud:

1. Visit https://n8n.io/cloud
2. Click "Start for free"
3. Sign up with email or Google account
4. Select a plan (free trial available)
5. Your workspace will be created and the n8n editor will open

n8n Cloud is free to start with up to 5,000 executions per month.`, ja: `n8n Cloudに登録するには：

1. https://n8n.io/cloud にアクセス
2. 「Start for free」をクリック
3. メールアドレスで登録、またはGoogleアカウントでサインアップ
4. プランを選択（無料トライアルあり）
5. ワークスペースが作成され、n8nエディタが開きます

n8n Cloudは無料で始められ、月間5,000回の実行まで無料枠があります。` },
        contentType: 'guide',
      },
      {
        title: { en: 'How to Set Up a Webhook Node', ja: 'Webhookノードの設定方法' },
        content: { en: `To set up a Webhook in n8n:

1. Create a new workflow
2. Click the "+" button to add a node
3. Search for and select "Webhook"
4. Configure:
   - HTTP Method: POST
   - Path: any path (e.g., /stripe-webhook)
5. Set "Respond" to "Using 'Respond to Webhook' Node" or simply "Immediately"
6. Toggle the workflow to "Active"
7. Copy the Production URL from the Webhook node

Use "Test URL" for testing, "Production URL" for production.`, ja: `n8nでWebhookを設定するには：

1. 新しいワークフローを作成
2. 「＋」ボタンをクリックしてノードを追加
3. 「Webhook」を検索して選択
4. 設定:
   - HTTP Method: POST
   - Path: 任意のパス（例: /stripe-webhook）
5. 「Respond」を「Using 'Respond to Webhook' Node」に設定するか、シンプルに「Immediately」を選択
6. ワークフローを「Active」に切り替え
7. WebhookノードのProduction URLをコピー

テスト時は「Test URL」、本番では「Production URL」を使用します。` },
        contentType: 'guide',
      },
      {
        title: { en: 'Cannot Access Webhook URL', ja: 'Webhook URLにアクセスできない' },
        content: { en: `If you cannot access the Webhook URL:

1. Verify the workflow is "Active"
   - The toggle switch in the top right must be ON
2. Confirm you're using the Production URL
   - Test URL is only valid during test execution
   - Production URL is needed for external access
3. Verify the URL was copied correctly
   - Check for leading/trailing spaces or line breaks
4. Check your network connection

If the issue persists, try disabling and re-enabling the workflow.`, ja: `Webhook URLにアクセスできない場合の対処法：

1. ワークフローが「Active」になっているか確認
   - 右上のトグルスイッチがONになっている必要があります
2. Production URLを使用しているか確認
   - Test URLはテスト実行時のみ有効
   - 外部からのアクセスにはProduction URLが必要
3. URLが正しくコピーされているか確認
   - 前後の空白や改行が含まれていないか確認
4. ネットワーク接続を確認

それでも解決しない場合は、ワークフローを一度無効化→有効化してみてください。` },
        contentType: 'troubleshoot',
      },
      {
        title: { en: 'How to Use Respond to Webhook Node', ja: 'Respond to Webhookノードの使い方' },
        content: { en: `To return a response from a Webhook, use the Respond to Webhook node:

1. Add a Webhook node
2. Change the Webhook node's "Respond" setting to "Using 'Respond to Webhook' Node"
3. Add a "Respond to Webhook" node at the end of your workflow
4. Configure the Respond to Webhook node:
   - Respond With: First Incoming Item (or as needed)
   - Response Code: 200 (success)
5. Connect: Webhook node → Processing nodes → Respond to Webhook node

For simple success responses, just set the Webhook node's "Respond" to "Immediately".`, ja: `Webhookにレスポンスを返すには、Respond to Webhookノードを使用します：

1. Webhookノードを追加
2. Webhookノードの「Respond」設定を「Using 'Respond to Webhook' Node」に変更
3. ワークフローの最後に「Respond to Webhook」ノードを追加
4. Respond to Webhookノードの設定:
   - Respond With: First Incoming Item（または必要に応じて選択）
   - Response Code: 200（成功）
5. Webhookノード → 処理ノード → Respond to Webhookノード の順に接続

シンプルに成功レスポンスだけ返す場合は、Webhookノードの「Respond」を「Immediately」に設定するだけでOKです。` },
        contentType: 'guide',
      },
    ],
  },

  // 外部サーバー設定クエスト用
  {
    questSlug: 'configure-external-server',
    documents: [
      {
        title: { en: 'How to Set Up Your External Server', ja: '外部サーバーのセットアップ方法' },
        content: { en: `To set up your external server for SaaS Quest verification:

## Requirements
Your server must:
1. Be accessible via HTTPS (or HTTP for localhost development)
2. Implement the status endpoint at \`/api/saas-quest/status\`
3. Accept and verify the authentication token

## Implementing the Status Endpoint

### Node.js/Express Example
\`\`\`javascript
app.get('/api/saas-quest/status', (req, res) => {
  // Optionally verify the token from headers
  const token = req.headers['x-verification-token'];
  if (token !== process.env.SAAS_QUEST_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ status: 'ok' });
});
\`\`\`

### Next.js API Route Example
\`\`\`typescript
export async function GET(request: Request) {
  const token = request.headers.get('x-verification-token');
  if (token !== process.env.SAAS_QUEST_TOKEN) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }
  return Response.json({ status: 'ok' });
}
\`\`\`

## Configuration Steps
1. Deploy your server with the status endpoint
2. Copy your server URL (e.g., https://your-app.vercel.app)
3. In SaaS Quest, go to /dashboard/server-config
4. Enter the URL and test the connection
5. Generate and save the verification token
6. Add the token to your server's environment variables`, ja: `SaaS Quest検証用に外部サーバーをセットアップするには：

## 要件
サーバーは以下を満たす必要があります：
1. HTTPS経由でアクセス可能（またはlocalhost開発用のHTTP）
2. \`/api/saas-quest/status\` にステータスエンドポイントを実装
3. 認証トークンを受け入れて検証

## ステータスエンドポイントの実装

### Node.js/Express 例
\`\`\`javascript
app.get('/api/saas-quest/status', (req, res) => {
  // オプションでヘッダーからトークンを検証
  const token = req.headers['x-verification-token'];
  if (token !== process.env.SAAS_QUEST_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ status: 'ok' });
});
\`\`\`

### Next.js API Route 例
\`\`\`typescript
export async function GET(request: Request) {
  const token = request.headers.get('x-verification-token');
  if (token !== process.env.SAAS_QUEST_TOKEN) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }
  return Response.json({ status: 'ok' });
}
\`\`\`

## 設定手順
1. ステータスエンドポイントを含むサーバーをデプロイ
2. サーバーURLをコピー（例：https://your-app.vercel.app）
3. SaaS Questで /dashboard/server-config にアクセス
4. URLを入力して接続をテスト
5. 検証トークンを生成して保存
6. サーバーの環境変数にトークンを追加` },
        contentType: 'guide',
      },
      {
        title: { en: 'Server Connection Test Fails', ja: 'サーバー接続テストが失敗する' },
        content: { en: `If the connection test fails, check the following:

## Common Issues

### 1. "Server URL must use HTTPS"
- Production URLs require HTTPS
- For local development, use http://localhost:3000

### 2. "Private IP addresses are not allowed"
- You cannot use internal network addresses
- Blocked: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
- Use a public URL instead

### 3. "Failed to connect"
- Verify your server is running and accessible
- Check firewall settings
- Ensure the endpoint exists at /api/saas-quest/status

### 4. "Server responded with status 404"
- The endpoint path might be wrong
- Verify your server implements /api/saas-quest/status exactly

### 5. "Server responded with status 500"
- Your server has an internal error
- Check server logs for details

## Debugging Steps
1. Open your browser's Network tab
2. Try accessing your-server-url/api/saas-quest/status directly
3. Verify it returns \`{ "status": "ok" }\`
4. Check CORS headers if needed

## Note About Connection Test
The connection test only verifies that your server is reachable. It does not verify token authentication or full functionality.`, ja: `接続テストが失敗する場合、以下を確認してください：

## よくある問題

### 1. "Server URL must use HTTPS"
- 本番URLはHTTPSが必須
- ローカル開発には http://localhost:3000 を使用

### 2. "Private IP addresses are not allowed"
- 内部ネットワークアドレスは使用不可
- ブロック: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
- 代わりにパブリックURLを使用

### 3. "Failed to connect"
- サーバーが起動中でアクセス可能か確認
- ファイアウォール設定を確認
- /api/saas-quest/status にエンドポイントが存在するか確認

### 4. "Server responded with status 404"
- エンドポイントパスが間違っている可能性
- サーバーが /api/saas-quest/status を正確に実装しているか確認

### 5. "Server responded with status 500"
- サーバー内部エラー
- サーバーログを確認

## デバッグ手順
1. ブラウザのNetworkタブを開く
2. your-server-url/api/saas-quest/status に直接アクセスしてみる
3. \`{ "status": "ok" }\` を返すか確認
4. 必要に応じてCORSヘッダーを確認

## 接続テストに関する注意
接続テストはサーバーが到達可能かどうかのみを検証します。トークン認証や完全な機能の検証は行いません。` },
        contentType: 'troubleshoot',
      },
    ],
  },

  // SSRF対策クエスト用
  {
    questSlug: 'understand-ssrf-protection',
    documents: [
      {
        title: { en: 'What is SSRF and Why It Matters', ja: 'SSRFとは何か、なぜ重要か' },
        content: { en: `SSRF (Server-Side Request Forgery) is a security vulnerability that can have severe consequences.

## The Attack
An attacker provides a URL to the server, which the server then fetches. If not properly validated:
- The server makes requests to internal resources
- The attacker can access internal services
- Sensitive data can be leaked

## Real-World Examples

### 1. Cloud Metadata Access
In AWS, GCP, and Azure, instance metadata is available at 169.254.169.254. An attacker could:
\`\`\`
http://169.254.169.254/latest/meta-data/iam/security-credentials/
\`\`\`
This could expose IAM credentials!

### 2. Internal Service Access
An attacker could access internal APIs:
\`\`\`
http://internal-api.local/admin/users
http://192.168.1.100:8080/debug
\`\`\`

### 3. Port Scanning
Attackers can use SSRF to scan internal ports:
\`\`\`
http://192.168.1.1:22  # SSH
http://192.168.1.1:3306  # MySQL
\`\`\`

## Prevention Strategies
1. Allowlist known-good domains
2. Block private IP ranges
3. Block internal domains (.local, .internal)
4. Require HTTPS for production
5. Validate URLs before making requests

## This Application's Approach
We implement defense-in-depth:
- URL validation before save
- URL validation before connection test
- URL validation before verification requests
- IPv4 and IPv6 private range blocking
- Internal domain blocking`, ja: `SSRF（Server-Side Request Forgery）は深刻な結果をもたらす可能性のあるセキュリティ脆弱性です。

## 攻撃の仕組み
攻撃者がサーバーにURLを提供し、サーバーがそれをフェッチします。適切に検証されないと：
- サーバーが内部リソースにリクエストを送信
- 攻撃者が内部サービスにアクセス
- 機密データが漏洩

## 実際の例

### 1. クラウドメタデータアクセス
AWS、GCP、Azureでは、インスタンスメタデータが169.254.169.254で利用可能。攻撃者は：
\`\`\`
http://169.254.169.254/latest/meta-data/iam/security-credentials/
\`\`\`
これによりIAM認証情報が漏洩する可能性！

### 2. 内部サービスアクセス
攻撃者は内部APIにアクセス可能：
\`\`\`
http://internal-api.local/admin/users
http://192.168.1.100:8080/debug
\`\`\`

### 3. ポートスキャン
SSRFを使って内部ポートをスキャン：
\`\`\`
http://192.168.1.1:22  # SSH
http://192.168.1.1:3306  # MySQL
\`\`\`

## 防止策
1. 既知の安全なドメインを許可リスト化
2. プライベートIP範囲をブロック
3. 内部ドメイン（.local, .internal）をブロック
4. 本番でHTTPSを必須化
5. リクエスト前にURLを検証

## このアプリケーションのアプローチ
多層防御を実装：
- 保存前のURL検証
- 接続テスト前のURL検証
- 検証リクエスト前のURL検証
- IPv4とIPv6プライベート範囲のブロック
- 内部ドメインのブロック` },
        contentType: 'guide',
      },
      {
        title: { en: 'Understanding Private IP Ranges', ja: 'プライベートIP範囲を理解する' },
        content: { en: `Private IP addresses are reserved for internal networks and should never be accessed from external services.

## IPv4 Private Ranges

### RFC 1918 Private Addresses
| Range | CIDR | Common Use |
|-------|------|------------|
| 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8 | Large networks |
| 172.16.0.0 - 172.31.255.255 | 172.16.0.0/12 | Medium networks |
| 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16 | Home/small office |

### Other Special Addresses
| Range | Purpose |
|-------|---------|
| 127.0.0.0/8 | Loopback (localhost) |
| 169.254.0.0/16 | Link-local (APIPA) |
| 0.0.0.0/8 | "This" network |

## IPv6 Private Ranges

| Prefix | Purpose |
|--------|---------|
| ::1 | Loopback |
| fc00::/7 | Unique Local (fc00::, fd00::) |
| fe80::/10 | Link-local |

## Why We Block These
1. Prevent access to internal services
2. Block cloud metadata endpoints
3. Stop internal network scanning
4. Protect local development servers

## Development Exception
For local development, we allow:
- localhost
- 127.0.0.1
- ::1

This lets developers test with local servers while still protecting against other private addresses.`, ja: `プライベートIPアドレスは内部ネットワーク用に予約されており、外部サービスからアクセスすべきではありません。

## IPv4プライベート範囲

### RFC 1918 プライベートアドレス
| 範囲 | CIDR | 一般的な用途 |
|------|------|------------|
| 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8 | 大規模ネットワーク |
| 172.16.0.0 - 172.31.255.255 | 172.16.0.0/12 | 中規模ネットワーク |
| 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16 | 家庭/小規模オフィス |

### その他の特殊アドレス
| 範囲 | 目的 |
|------|------|
| 127.0.0.0/8 | ループバック（localhost） |
| 169.254.0.0/16 | リンクローカル（APIPA） |
| 0.0.0.0/8 | "this" ネットワーク |

## IPv6プライベート範囲

| プレフィックス | 目的 |
|--------------|------|
| ::1 | ループバック |
| fc00::/7 | ユニークローカル（fc00::, fd00::） |
| fe80::/10 | リンクローカル |

## これらをブロックする理由
1. 内部サービスへのアクセスを防止
2. クラウドメタデータエンドポイントをブロック
3. 内部ネットワークスキャンを阻止
4. ローカル開発サーバーを保護

## 開発用例外
ローカル開発用に以下を許可：
- localhost
- 127.0.0.1
- ::1

これにより開発者はローカルサーバーでテストでき、他のプライベートアドレスからは保護されます。` },
        contentType: 'guide',
      },
    ],
  },

  // APIキー暗号化クエスト用
  {
    questSlug: 'understand-api-key-encryption',
    documents: [
      {
        title: { en: 'How AES-256-GCM Encryption Works', ja: 'AES-256-GCM暗号化の仕組み' },
        content: { en: `AES-256-GCM is the encryption standard used to protect sensitive settings.

## What is AES-256-GCM?
- **AES**: Advanced Encryption Standard
- **256**: 256-bit key size (very secure)
- **GCM**: Galois/Counter Mode (authenticated encryption)

## Key Components

### 1. Encryption Key (256 bits)
The secret key used for encryption and decryption.
\`\`\`bash
# Generate a secure key
openssl rand -hex 32
\`\`\`

### 2. Initialization Vector (IV)
A random 12-byte value that ensures the same plaintext encrypts differently each time.

### 3. Authentication Tag
A 16-byte tag that verifies the ciphertext hasn't been tampered with.

## The Encryption Process
1. Generate random IV (12 bytes)
2. Create cipher with key and IV
3. Encrypt the plaintext
4. Get authentication tag
5. Combine: \`encrypted:iv:tag:ciphertext\`

## The Decryption Process
1. Parse the stored value
2. Extract IV, tag, and ciphertext
3. Create decipher with key and IV
4. Set authentication tag
5. Decrypt and verify integrity

## Security Properties
- **Confidentiality**: Data is unreadable without the key
- **Integrity**: Any tampering is detected
- **Authentication**: Data origin is verified

## Best Practices
1. Never reuse IVs (we generate random ones)
2. Protect the encryption key
3. Use environment variables for the key
4. Never log encrypted data
5. Rotate keys periodically`, ja: `AES-256-GCMは機密設定を保護するために使用される暗号化標準です。

## AES-256-GCMとは
- **AES**: Advanced Encryption Standard（高度暗号化標準）
- **256**: 256ビットのキーサイズ（非常に安全）
- **GCM**: Galois/Counter Mode（認証付き暗号化）

## 主要コンポーネント

### 1. 暗号化キー（256ビット）
暗号化と復号に使用される秘密鍵。
\`\`\`bash
# 安全なキーを生成
openssl rand -hex 32
\`\`\`

### 2. 初期化ベクトル（IV）
同じ平文が毎回異なる方法で暗号化されることを保証するランダムな12バイト値。

### 3. 認証タグ
暗号文が改ざんされていないことを検証する16バイトのタグ。

## 暗号化プロセス
1. ランダムIVを生成（12バイト）
2. キーとIVでcipherを作成
3. 平文を暗号化
4. 認証タグを取得
5. 結合: \`encrypted:iv:tag:ciphertext\`

## 復号プロセス
1. 保存された値をパース
2. IV、タグ、暗号文を抽出
3. キーとIVでdecipherを作成
4. 認証タグを設定
5. 復号して整合性を検証

## セキュリティ特性
- **機密性**: キーなしではデータは読めない
- **整合性**: 改ざんが検出される
- **認証**: データの出所が検証される

## ベストプラクティス
1. IVを再利用しない（ランダム生成）
2. 暗号化キーを保護する
3. キーには環境変数を使用
4. 暗号化データをログに出力しない
5. 定期的にキーをローテーション` },
        contentType: 'guide',
      },
      {
        title: { en: 'Encryption Key Rotation', ja: '暗号化キーのローテーション' },
        content: { en: `Key rotation is an important security practice that should be performed periodically.

## Why Rotate Keys?
1. Limit exposure if a key is compromised
2. Meet compliance requirements
3. Reduce the amount of data encrypted with one key
4. Best practice for security hygiene

## Rotation Strategy

### Preparation
1. Generate a new encryption key
2. Plan for downtime or gradual migration
3. Backup current encrypted data

### Migration Steps
1. Read all encrypted settings
2. Decrypt with old key
3. Re-encrypt with new key
4. Update database
5. Update ENCRYPTION_KEY environment variable
6. Restart application

### Example Migration Script
\`\`\`typescript
// Pseudocode for key rotation
const oldKey = process.env.OLD_ENCRYPTION_KEY;
const newKey = process.env.NEW_ENCRYPTION_KEY;

// For each user's settings
const settings = await getAllUserSettings();
for (const setting of settings) {
  const decrypted = decrypt(setting.value, oldKey);
  const reEncrypted = encrypt(decrypted, newKey);
  await updateSetting(setting.id, reEncrypted);
}
\`\`\`

## Frequency Recommendations
| Environment | Frequency |
|-------------|-----------|
| Development | As needed |
| Staging | Monthly |
| Production | Quarterly or after incidents |

## Post-Rotation Checklist
- [ ] All settings still decrypt correctly
- [ ] Old key is securely disposed of
- [ ] Key rotation date is documented
- [ ] Access logs are reviewed`, ja: `キーローテーションは定期的に実行すべき重要なセキュリティプラクティスです。

## キーをローテーションする理由
1. キーが漏洩した場合の露出を制限
2. コンプライアンス要件を満たす
3. 1つのキーで暗号化されるデータ量を減らす
4. セキュリティ衛生のベストプラクティス

## ローテーション戦略

### 準備
1. 新しい暗号化キーを生成
2. ダウンタイムまたは段階的移行を計画
3. 現在の暗号化データをバックアップ

### 移行手順
1. すべての暗号化設定を読み込み
2. 古いキーで復号
3. 新しいキーで再暗号化
4. データベースを更新
5. ENCRYPTION_KEY環境変数を更新
6. アプリケーションを再起動

### 移行スクリプト例
\`\`\`typescript
// キーローテーションの疑似コード
const oldKey = process.env.OLD_ENCRYPTION_KEY;
const newKey = process.env.NEW_ENCRYPTION_KEY;

// 各ユーザーの設定について
const settings = await getAllUserSettings();
for (const setting of settings) {
  const decrypted = decrypt(setting.value, oldKey);
  const reEncrypted = encrypt(decrypted, newKey);
  await updateSetting(setting.id, reEncrypted);
}
\`\`\`

## 推奨頻度
| 環境 | 頻度 |
|------|------|
| 開発 | 必要に応じて |
| ステージング | 毎月 |
| 本番 | 四半期ごとまたはインシデント後 |

## ローテーション後チェックリスト
- [ ] すべての設定が正しく復号される
- [ ] 古いキーは安全に廃棄済み
- [ ] キーローテーション日を文書化
- [ ] アクセスログをレビュー済み` },
        contentType: 'guide',
      },
      {
        title: { en: 'Encrypted Setting Not Working', ja: '暗号化された設定が機能しない' },
        content: { en: `If encrypted settings are not working correctly, follow this troubleshooting guide.

## Common Issues

### 1. "Invalid encryption key"
- ENCRYPTION_KEY environment variable is missing or invalid
- Key must be exactly 64 hex characters (32 bytes)
- Check for trailing spaces or newlines

### 2. Decryption fails silently
- The stored value might not be encrypted
- Check if value starts with "encrypted:"
- The key might have changed since encryption

### 3. Setting shows as not configured
- Empty values are treated as unconfigured
- Boolean false is treated as unconfigured
- Check the setting definition's isEncrypted flag

## Debugging Steps

### Check Environment Variable
\`\`\`bash
# Should be 64 characters
echo $ENCRYPTION_KEY | wc -c
\`\`\`

### Check Database Value
\`\`\`sql
SELECT tool_settings FROM user_settings WHERE user_id = ?;
\`\`\`
Look for "encrypted:" prefix in the JSON.

### Test Encryption/Decryption
\`\`\`typescript
import { encrypt, decrypt } from '@/lib/encryption';
const encrypted = encrypt('test-value');
console.log('Encrypted:', encrypted);
const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);
\`\`\`

## Recovery Options

### If Key is Lost
Unfortunately, if the encryption key is lost, encrypted data cannot be recovered. Users will need to re-enter their settings.

### If Data is Corrupted
1. Identify the corrupted setting
2. Clear the value in the database
3. Ask user to re-enter the setting`, ja: `暗号化された設定が正しく機能しない場合は、このトラブルシューティングガイドに従ってください。

## よくある問題

### 1. "Invalid encryption key"
- ENCRYPTION_KEY環境変数が見つからないか無効
- キーは正確に64の16進文字（32バイト）が必要
- 末尾のスペースや改行を確認

### 2. 復号が静かに失敗する
- 保存された値が暗号化されていない可能性
- 値が "encrypted:" で始まるか確認
- 暗号化以降にキーが変更された可能性

### 3. 設定が未設定と表示される
- 空の値は未設定として扱われる
- Boolean falseは未設定として扱われる
- 設定定義のisEncryptedフラグを確認

## デバッグ手順

### 環境変数を確認
\`\`\`bash
# 64文字であるべき
echo $ENCRYPTION_KEY | wc -c
\`\`\`

### データベースの値を確認
\`\`\`sql
SELECT tool_settings FROM user_settings WHERE user_id = ?;
\`\`\`
JSONで "encrypted:" プレフィックスを探す。

### 暗号化/復号をテスト
\`\`\`typescript
import { encrypt, decrypt } from '@/lib/encryption';
const encrypted = encrypt('test-value');
console.log('Encrypted:', encrypted);
const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);
\`\`\`

## リカバリオプション

### キーを紛失した場合
残念ながら、暗号化キーを紛失すると、暗号化されたデータは復元できません。ユーザーは設定を再入力する必要があります。

### データが破損した場合
1. 破損した設定を特定
2. データベースで値をクリア
3. ユーザーに設定の再入力を依頼` },
        contentType: 'troubleshoot',
      },
    ],
  },

  // 設定管理クエスト用
  {
    questSlug: 'settings-management',
    documents: [
      {
        title: { en: 'How to Create a Setting Definition', ja: '設定定義の作成方法' },
        content: { en: `To create a new setting definition:

1. Navigate to /admin/settings
2. Click "New Setting" button
3. Fill in the form:
   - **Key**: Unique identifier (e.g., "myApiKey") - cannot be changed later
   - **Name**: Display name (e.g., "My API Key")
   - **Description**: Optional explanation
   - **Category**: Group name (e.g., "integration", "ai")
   - **Value Type**: string, boolean, apiKey, or url
   - **Encrypted**: Enable for sensitive values like API keys
   - **Active**: Whether the setting is usable
4. Click "Create"

The setting will now appear in the settings list and can be used as a tool unlock condition.`, ja: `新しい設定定義を作成するには：

1. /admin/settings にアクセス
2. 「New Setting」ボタンをクリック
3. フォームに入力:
   - **Key**: 一意の識別子（例: "myApiKey"）- 後から変更不可
   - **Name**: 表示名（例: "My API Key"）
   - **Description**: 任意の説明
   - **Category**: グループ名（例: "integration", "ai"）
   - **Value Type**: string, boolean, apiKey, url のいずれか
   - **Encrypted**: APIキーなど機密性の高い値の場合は有効化
   - **Active**: 設定が使用可能かどうか
4. 「Create」をクリック

設定が一覧に表示され、ツールのアンロック条件として使用できるようになります。` },
        contentType: 'guide',
      },
      {
        title: { en: 'How to Use Settings as Tool Unlock Conditions', ja: '設定をツールアンロック条件として使う方法' },
        content: { en: `To require a setting for tool access:

1. First, ensure the setting exists in /admin/settings
2. Go to /admin/tools
3. Click the pencil icon to edit a tool (or create new)
4. Scroll to "Unlock Conditions" section
5. In "Required Settings", check the settings you want to require
6. Click "Update" or "Create"

Now users must configure those settings (in their dashboard) before they can access the tool.

## How it works
- Settings store user values in \`user_settings.tool_settings\` JSONB
- The system checks if required settings have valid values
- Empty strings, null, and false are considered "not configured"
- Encrypted settings are automatically decrypted when checking`, ja: `ツールへのアクセスに設定を必須にするには：

1. まず /admin/settings で設定が存在することを確認
2. /admin/tools にアクセス
3. ツールの編集アイコン（鉛筆）をクリック（または新規作成）
4. 「Unlock Conditions」セクションまでスクロール
5. 「Required Settings」で必須にしたい設定にチェック
6. 「Update」または「Create」をクリック

これでユーザーはツールにアクセスする前に、ダッシュボードでそれらの設定を構成する必要があります。

## 仕組み
- 設定は \`user_settings.tool_settings\` JSONBにユーザー値を保存
- システムは必須設定に有効な値があるかチェック
- 空文字、null、false は「未設定」とみなされる
- 暗号化された設定はチェック時に自動的に復号化` },
        contentType: 'guide',
      },
      {
        title: { en: 'Setting Not Recognized as Configured', ja: '設定が設定済みとして認識されない' },
        content: { en: `If a setting shows as "not configured" even after the user enters a value:

## Common Causes

1. **Empty value**: Ensure the user entered a non-empty value
2. **Boolean set to false**: Boolean settings with value \`false\` are treated as unconfigured
3. **Encryption issue**: If marked as encrypted, verify ENCRYPTION_KEY is set in environment
4. **Setting not active**: Check if the setting definition is marked as "Active"

## Debugging Steps

1. Check /admin/settings to verify the setting definition
2. Look at /admin/users to see the user's tool_settings
3. Verify the key name matches exactly (case-sensitive)
4. For encrypted settings, ensure the value was saved (not just displayed)

## API Check
You can verify via the API:
\`\`\`
GET /api/tools
\`\`\`
This returns tool unlock status including which settings are missing.`, ja: `ユーザーが値を入力したにもかかわらず設定が「未設定」と表示される場合：

## よくある原因

1. **空の値**: ユーザーが空でない値を入力したか確認
2. **Booleanがfalse**: Boolean設定で値が \`false\` の場合は未設定として扱われる
3. **暗号化の問題**: 暗号化対象の場合、環境変数のENCRYPTION_KEYが設定されているか確認
4. **設定が無効**: 設定定義が「Active」になっているか確認

## デバッグ手順

1. /admin/settings で設定定義を確認
2. /admin/users でユーザーの tool_settings を確認
3. キー名が完全に一致しているか確認（大文字小文字を区別）
4. 暗号化された設定の場合、値が保存されているか確認（表示されているだけでなく）

## API確認
APIで確認できます：
\`\`\`
GET /api/tools
\`\`\`
これはツールのアンロック状態（どの設定が足りないかを含む）を返します。` },
        contentType: 'troubleshoot',
      },
      {
        title: { en: 'How Encryption Works for Settings', ja: '設定の暗号化の仕組み' },
        content: { en: `When a setting is marked as "Encrypted":

## Automatic Encryption
- Values are encrypted before saving to database
- Uses AES-256-GCM encryption
- Stored with "encrypted:" prefix
- Decrypted automatically when reading

## Requirements
- ENCRYPTION_KEY must be set in environment variables
- Key should be a random 32-byte hex string
- Example: \`openssl rand -hex 32\`

## How it Works
1. User enters value (e.g., API key)
2. System checks if setting key is marked encrypted in setting_definitions
3. If encrypted, value is encrypted before database save
4. On read, "encrypted:" prefix is detected and value is decrypted

## Cache Behavior
- Encrypted key list is cached for performance
- Cache is cleared when setting definitions are created/updated/deleted
- Fallback list used if database is unavailable

## Best Practices
- Always mark API keys and tokens as encrypted
- Use valueType "apiKey" for API keys (visual hint)
- Never store encrypted values in logs or error messages`, ja: `設定が「Encrypted」とマークされている場合：

## 自動暗号化
- 値はデータベース保存前に暗号化
- AES-256-GCM暗号化を使用
- "encrypted:" プレフィックス付きで保存
- 読み込み時に自動的に復号化

## 要件
- 環境変数にENCRYPTION_KEYを設定する必要がある
- キーはランダムな32バイトの16進文字列
- 例: \`openssl rand -hex 32\`

## 仕組み
1. ユーザーが値を入力（例: APIキー）
2. システムがsetting_definitionsで設定キーが暗号化対象かチェック
3. 暗号化対象の場合、データベース保存前に値を暗号化
4. 読み込み時、"encrypted:" プレフィックスを検出して復号化

## キャッシュ動作
- 暗号化対象キーリストはパフォーマンスのためキャッシュ
- 設定定義の作成/更新/削除時にキャッシュクリア
- データベースが利用できない場合はフォールバックリストを使用

## ベストプラクティス
- APIキーやトークンは常に暗号化対象にする
- APIキーにはvalueType "apiKey" を使用（視覚的ヒント）
- 暗号化された値はログやエラーメッセージに出力しない` },
        contentType: 'guide',
      },
    ],
  },
];

// ドキュメントを投入
export async function seedDocuments(apiKey: string) {
  console.log('Seeding quest documents...');

  for (const questData of initialDocuments) {
    // クエストIDを取得
    const quest = await db
      .select({ id: quests.id })
      .from(quests)
      .where(eq(quests.slug, questData.questSlug))
      .limit(1);

    if (quest.length === 0) {
      console.log(`Quest not found: ${questData.questSlug}`);
      continue;
    }

    const questId = quest[0].id;
    console.log(`Processing quest: ${questData.questSlug} (ID: ${questId})`);

    for (const doc of questData.documents) {
      // 既存のドキュメントを確認（英語タイトルでJSONB検索）
      const existingDoc = await db
        .select({ id: questDocuments.id })
        .from(questDocuments)
        .where(sql`${questDocuments.title}->>'en' = ${doc.title.en}`)
        .limit(1);

      if (existingDoc.length > 0) {
        console.log(`  Skip (exists): ${doc.title.en}`);
        continue;
      }

      // 埋め込みを生成（英語テキストを使用）
      console.log(`  Generating embedding: ${doc.title.en}`);
      const textToEmbed = `${doc.title.en}\n${doc.content.en}`;
      const embedding = await generateEmbedding(apiKey, textToEmbed);

      // ドキュメントを挿入
      await db.insert(questDocuments).values({
        questId,
        title: doc.title,
        content: doc.content,
        contentType: doc.contentType,
        embedding: embedding,
      });

      console.log(`  Added: ${doc.title.en}`);

      // レート制限対策で少し待機
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log('Done seeding documents!');
}

// CLI実行用
if (require.main === module) {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error('Usage: npx tsx lib/db/seed-documents.ts <GEMINI_API_KEY>');
    process.exit(1);
  }

  seedDocuments(apiKey)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
