import { db } from './drizzle';
import { quests, questDocuments, chatMessages, chatSessions, userQuestProgress, chapters } from './schema';

// 全クエストデータを投入（初期クエスト + 開発用クエスト統合版）
async function seedAllQuests() {
  console.log('Creating all chapters and quests...');

  // 既存のデータを削除（外部キー制約順）
  console.log('Clearing existing data...');
  await db.delete(chatMessages);
  await db.delete(chatSessions);
  await db.delete(userQuestProgress);
  await db.delete(questDocuments);
  await db.delete(quests);
  await db.delete(chapters);

  // ========================================
  // チャプター作成
  // ========================================
  console.log('Creating chapters...');

  // チャプター1: Stripe Setup（初期クエスト）
  const [chapter1] = await db.insert(chapters).values({
    slug: 'stripe-setup',
    title: { en: 'Stripe Setup', ja: 'Stripe設定' },
    description: {
      en: 'Set up Stripe for payment processing and subscription management.',
      ja: 'Stripeを設定して決済処理とサブスクリプション管理を行います。',
    },
    order: 1,
  }).returning();

  // チャプター2: Automation（初期クエスト）
  const [chapter2] = await db.insert(chapters).values({
    slug: 'automation',
    title: { en: 'Automation', ja: '自動化' },
    description: {
      en: 'Automate your workflows with n8n and webhooks.',
      ja: 'n8nとWebhookでワークフローを自動化します。',
    },
    order: 2,
  }).returning();

  // チャプター3: Environment Setup（開発用クエスト）
  const [chapter3] = await db.insert(chapters).values({
    slug: 'environment-setup',
    title: { en: 'Environment Setup', ja: '環境構築' },
    description: { en: 'Set up your development environment', ja: '開発環境を構築します' },
    order: 3,
  }).returning();

  // チャプター4: Authentication & User Management（開発用クエスト）
  const [chapter4] = await db.insert(chapters).values({
    slug: 'auth-user-management',
    title: { en: 'Authentication & User Management', ja: '認証・ユーザー管理' },
    description: { en: 'Set up authentication and user roles', ja: '認証とユーザーロールを設定します' },
    order: 4,
  }).returning();

  // チャプター5: AI Integration（開発用クエスト）
  const [chapter5] = await db.insert(chapters).values({
    slug: 'ai-integration',
    title: { en: 'AI Integration', ja: 'AI連携' },
    description: { en: 'Integrate Gemini API and RAG system', ja: 'Gemini APIとRAGシステムを統合します' },
    order: 5,
  }).returning();

  // チャプター6: Admin & Deployment（開発用クエスト）
  const [chapter6] = await db.insert(chapters).values({
    slug: 'admin-deployment',
    title: { en: 'Admin & Deployment', ja: '管理画面とデプロイ' },
    description: { en: 'Explore admin features and deploy to production', ja: '管理機能を探索し、本番環境にデプロイします' },
    order: 6,
  }).returning();

  // チャプター7: Internationalization（多言語化）
  const [chapter7] = await db.insert(chapters).values({
    slug: 'internationalization',
    title: { en: 'Internationalization', ja: '多言語化' },
    description: { en: 'Learn how to use and extend the i18n system', ja: '多言語システムの使い方と拡張方法を学びます' },
    order: 7,
  }).returning();

  // チャプター8: Content Structure（コンテンツ構造）
  const [chapter8] = await db.insert(chapters).values({
    slug: 'content-structure',
    title: { en: 'Content Structure', ja: 'コンテンツ構造' },
    description: { en: 'Organize your content with books, chapters, and quests', ja: 'ブック、チャプター、クエストでコンテンツを整理します' },
    order: 8,
  }).returning();

  // チャプター9: Rewards（リワード）
  const [chapter9] = await db.insert(chapters).values({
    slug: 'rewards',
    title: { en: 'Rewards', ja: 'リワード' },
    description: { en: 'Set up and manage the reward system', ja: 'リワードシステムを設定・管理します' },
    order: 9,
  }).returning();

  // チャプター10: Team & Security（チーム・セキュリティ）
  const [chapter10] = await db.insert(chapters).values({
    slug: 'team-security',
    title: { en: 'Team & Security', ja: 'チーム・セキュリティ' },
    description: { en: 'Manage teams and security settings', ja: 'チームとセキュリティ設定を管理します' },
    order: 10,
  }).returning();

  // ========================================
  // クエスト作成
  // ========================================
  console.log('Creating quests...');

  const allQuests = [
    // ----------------------------------------
    // チャプター1: Stripe Setup（初期クエスト）
    // ----------------------------------------
    {
      slug: 'stripe-account',
      title: { en: 'Create a Stripe Account', ja: 'Stripeアカウントを作成する' },
      description: {
        en: 'Create a Stripe account and get your API keys. This is the first step to monetizing your SaaS.',
        ja: 'Stripeアカウントを作成し、APIキーを取得します。これがSaaS収益化の第一歩です。',
      },
      chapterId: chapter1.id,
      order: 1,
      category: 'setup',
      verificationType: 'api_key',
    },
    {
      slug: 'stripe-product',
      title: { en: 'Create a Stripe Product', ja: 'Stripe商品を作成する' },
      description: {
        en: 'Set up your first product and pricing in the Stripe dashboard.',
        ja: 'Stripeダッシュボードで最初の商品と価格を設定します。',
      },
      chapterId: chapter1.id,
      order: 2,
      category: 'setup',
      verificationType: 'stripe_product',
    },

    // ----------------------------------------
    // チャプター2: Automation（初期クエスト）
    // ----------------------------------------
    {
      slug: 'n8n-setup',
      title: { en: 'Set Up n8n Workflow', ja: 'n8nワークフローを設定する' },
      description: {
        en: 'Build an automation workflow with n8n to receive Stripe Webhooks.',
        ja: 'n8nでStripe Webhookを受け取り、自動化ワークフローを構築します。',
      },
      chapterId: chapter2.id,
      order: 1,
      category: 'automation',
      verificationType: 'webhook',
    },

    // ----------------------------------------
    // チャプター3: Environment Setup（開発用クエスト）
    // ----------------------------------------
    {
      slug: 'setup-nextjs-starter',
      title: { en: 'Set up Next.js SaaS Starter', ja: 'Next.js SaaSスターターをセットアップ' },
      description: { en: `Clone the Next.js SaaS starter template and set up your development environment.

## Goals
- Clone the template from GitHub
- Install dependencies
- Start the dev server and verify it works

## Steps
1. \`git clone https://github.com/nextjs/saas-starter\`
2. \`pnpm install\`
3. Verify with \`pnpm dev\``, ja: `Next.js SaaSスターターテンプレートをクローンし、開発環境を構築します。

## 目標
- GitHubからテンプレートをクローン
- 依存関係をインストール
- 開発サーバーを起動して動作確認

## 手順
1. \`git clone https://github.com/nextjs/saas-starter\`
2. \`pnpm install\`
3. \`pnpm dev\` で起動確認` },
      chapterId: chapter3.id,
      order: 1,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'setup-docker-postgres',
      title: { en: 'Set up Docker PostgreSQL', ja: 'Docker PostgreSQLを構築' },
      description: { en: `Build a PostgreSQL database with Docker, including the pgvector extension.

## Goals
- Create docker-compose.yml
- Start PostgreSQL container
- Enable pgvector extension

## docker-compose.yml example
\`\`\`yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5450:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saas_quest
\`\`\``, ja: `DockerでPostgreSQLデータベースを構築します。pgvector拡張も含めます。

## 目標
- docker-compose.ymlを作成
- PostgreSQLコンテナを起動
- pgvector拡張を有効化

## docker-compose.yml例
\`\`\`yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5450:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saas_quest
\`\`\`` },
      chapterId: chapter3.id,
      order: 2,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'setup-env-variables',
      title: { en: 'Configure Environment Variables', ja: '環境変数を設定' },
      description: { en: `Set up the required environment variables for the application.

## Required Variables
- \`POSTGRES_URL\`: Database connection URL
- \`AUTH_SECRET\`: Authentication secret
- \`BASE_URL\`: Application base URL
- \`ENCRYPTION_KEY\`: Key for API key encryption

## Generate Secrets
\`\`\`bash
openssl rand -base64 32
\`\`\``, ja: `アプリケーションに必要な環境変数を設定します。

## 必須の環境変数
- \`POSTGRES_URL\`: データベース接続URL
- \`AUTH_SECRET\`: 認証用シークレット
- \`BASE_URL\`: アプリケーションのベースURL
- \`ENCRYPTION_KEY\`: APIキー暗号化用キー

## シークレットの生成方法
\`\`\`bash
openssl rand -base64 32
\`\`\`` },
      chapterId: chapter3.id,
      order: 3,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'run-db-migrations',
      title: { en: 'Run Database Migrations', ja: 'データベースマイグレーションを実行' },
      description: { en: `Create the database schema using Drizzle ORM.

## Steps
1. Generate migration files with \`pnpm db:generate\`
2. Apply migrations with \`pnpm db:migrate\`
3. Verify tables were created in the database`, ja: `Drizzle ORMを使用してデータベーススキーマを作成します。

## 手順
1. \`pnpm db:generate\` でマイグレーションファイルを生成
2. \`pnpm db:migrate\` でマイグレーションを適用
3. データベースにテーブルが作成されたことを確認` },
      chapterId: chapter3.id,
      order: 4,
      category: 'setup',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター4: Authentication & User Management（開発用クエスト）
    // ----------------------------------------
    {
      slug: 'create-user-account',
      title: { en: 'Create a User Account', ja: 'ユーザーアカウントを作成' },
      description: { en: `Register a user account in the application.

## Steps
1. Navigate to http://localhost:3000/sign-up
2. Enter your email and password
3. Create the account

## Verification
Confirm that the dashboard appears after login`, ja: `アプリケーションでユーザー登録を行います。

## 手順
1. http://localhost:3000/sign-up にアクセス
2. メールアドレスとパスワードを入力
3. アカウントを作成

## 確認
ログイン後、ダッシュボードが表示されることを確認` },
      chapterId: chapter4.id,
      order: 1,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'setup-admin-role',
      title: { en: 'Set Up Admin Role', ja: '管理者ロールを設定' },
      description: { en: `Grant admin privileges to a user.

## Direct SQL Setup
\`\`\`sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
\`\`\`

## Verification
Access /admin and verify that the admin dashboard appears`, ja: `ユーザーに管理者権限を付与します。

## SQLで直接設定
\`\`\`sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
\`\`\`

## 確認
/admin にアクセスして管理画面が表示されることを確認` },
      chapterId: chapter4.id,
      order: 2,
      category: 'setup',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター5: AI Integration（開発用クエスト）
    // ----------------------------------------
    {
      slug: 'get-gemini-api-key',
      title: { en: 'Get Gemini API Key', ja: 'Gemini APIキーを取得' },
      description: { en: `Obtain a Gemini API key from Google AI Studio.

## Steps
1. Visit https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key

## Notes
- Keep your API key secure
- Be aware of free tier limits`, ja: `Google AI StudioでGemini APIキーを取得します。

## 手順
1. https://aistudio.google.com/ にアクセス
2. Googleアカウントでログイン
3. 「Get API Key」をクリック
4. 新しいAPIキーを作成

## 注意
- APIキーは安全に保管してください
- 無料枠の制限に注意` },
      chapterId: chapter5.id,
      order: 1,
      category: 'integration',
      verificationType: 'api_key',
    },
    {
      slug: 'configure-gemini-settings',
      title: { en: 'Configure Gemini Settings', ja: 'Gemini設定を構成' },
      description: { en: `Set up the Gemini API in the application.

## Steps
1. Open "General" settings in the dashboard
2. Enter your Gemini API Key
3. Select a model (gemini-2.5-flash-lite recommended)
4. Enable AI Chat

## Available Models
- gemini-2.5-flash-lite (fast, low cost)
- gemini-2.5-flash (balanced)
- gemini-3-flash (latest, high performance)`, ja: `アプリケーションでGemini APIを設定します。

## 手順
1. ダッシュボードの「General」設定を開く
2. Gemini API Keyを入力
3. モデルを選択（gemini-2.5-flash-lite推奨）
4. AI Chatを有効化

## 利用可能なモデル
- gemini-2.5-flash-lite（高速・低コスト）
- gemini-2.5-flash（バランス型）
- gemini-3-flash（最新・高性能）` },
      chapterId: chapter5.id,
      order: 2,
      category: 'integration',
      verificationType: 'manual',
    },
    {
      slug: 'understand-rag-system',
      title: { en: 'Understand the RAG System', ja: 'RAGシステムを理解する' },
      description: { en: `Learn how RAG (Retrieval-Augmented Generation) works.

## What is RAG?
1. **Retrieval**: Search for documents related to the question
2. **Augmentation**: Add search results to the prompt
3. **Generation**: LLM generates the answer

## Implementation in This App
- Vector search with pgvector
- Embedding generation with Gemini text-embedding-004
- Retrieve related documents by cosine similarity`, ja: `RAG（Retrieval-Augmented Generation）の仕組みを学びます。

## RAGとは
1. **Retrieval**: 質問に関連するドキュメントを検索
2. **Augmentation**: 検索結果をプロンプトに追加
3. **Generation**: LLMが回答を生成

## このアプリでの実装
- pgvectorでベクトル検索
- Gemini text-embedding-004でembedding生成
- コサイン類似度で関連ドキュメントを取得` },
      chapterId: chapter5.id,
      order: 3,
      category: 'integration',
      verificationType: 'manual',
    },
    {
      slug: 'add-rag-documents',
      title: { en: 'Add RAG Documents', ja: 'RAGドキュメントを追加' },
      description: { en: `Add documents for quests from the admin panel.

## Steps
1. Navigate to /admin/documents
2. Select a quest
3. Click "Add Document" to add a document
4. Embeddings are generated automatically

## Document Types
- FAQ: Frequently asked questions
- Guide: Step-by-step guides
- Troubleshoot: Troubleshooting guides`, ja: `管理画面からクエスト用のドキュメントを追加します。

## 手順
1. /admin/documents にアクセス
2. クエストを選択
3. 「Add Document」でドキュメントを追加
4. embeddingが自動生成される

## ドキュメントタイプ
- FAQ: よくある質問
- Guide: 手順ガイド
- Troubleshoot: トラブルシューティング` },
      chapterId: chapter5.id,
      order: 4,
      category: 'integration',
      verificationType: 'manual',
    },
    {
      slug: 'test-ai-chat',
      title: { en: 'Test AI Chat', ja: 'AIチャットをテスト' },
      description: { en: `Test the AI chat on the quest detail page.

## Steps
1. Select a quest from /dashboard/quests
2. Enter a question in the chat panel
3. Verify that the response references RAG documents

## Verification Points
- Related documents appear as "Sources"
- The response is based on document content`, ja: `クエスト詳細画面でAIチャットをテストします。

## 手順
1. /dashboard/quests からクエストを選択
2. チャットパネルで質問を入力
3. RAGドキュメントを参照した回答が返ることを確認

## 確認ポイント
- 関連ドキュメントが「Sources」として表示される
- 回答がドキュメントの内容に基づいている` },
      chapterId: chapter5.id,
      order: 5,
      category: 'integration',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター6: Admin & Deployment（開発用クエスト）
    // ----------------------------------------
    {
      slug: 'explore-admin-dashboard',
      title: { en: 'Explore the Admin Dashboard', ja: '管理ダッシュボードを探索' },
      description: { en: `Explore the admin panel features at /admin.

## Admin Panel Features
- **Dashboard**: User count, quest completion rate, and other statistics
- **Users**: User list and role management
- **Quests**: Create, edit, and delete quests
- **Documents**: RAG document management
- **Analytics**: GA4 integration (after setup)`, ja: `/admin で管理画面の機能を確認します。

## 管理画面の機能
- **Dashboard**: ユーザー数、クエスト完了率などの統計
- **Users**: ユーザー一覧とロール管理
- **Quests**: クエストの作成・編集・削除
- **Documents**: RAGドキュメント管理
- **Analytics**: GA4連携（設定後）` },
      chapterId: chapter6.id,
      order: 1,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'create-custom-quest',
      title: { en: 'Create a Custom Quest', ja: 'カスタムクエストを作成' },
      description: { en: `Create your own quest from the admin panel.

## Steps
1. Click "New Quest" at /admin/quests
2. Enter title, slug, and description
3. Select category and verification type
4. Set a prerequisite quest if needed

## Categories
- setup: Initial setup
- automation: Automation
- integration: External integrations
- advanced: For advanced users`, ja: `管理画面から独自のクエストを作成します。

## 手順
1. /admin/quests で「New Quest」をクリック
2. タイトル、スラッグ、説明を入力
3. カテゴリと検証タイプを選択
4. 必要に応じて前提クエストを設定

## カテゴリ
- setup: 初期設定
- automation: 自動化
- integration: 外部連携
- advanced: 上級者向け` },
      chapterId: chapter6.id,
      order: 2,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'setup-github-repo',
      title: { en: 'Create a GitHub Repository', ja: 'GitHubリポジトリを作成' },
      description: { en: `Push the project to GitHub.

## Steps
1. \`gh repo create your-repo --private\`
2. Check \`.gitignore\` (ensure .env is excluded)
3. \`git add -A && git commit -m "Initial commit"\`
4. \`git push -u origin main\`

## Security Checklist
- [ ] .env file is not included
- [ ] No hardcoded API keys
- [ ] Credential files are excluded`, ja: `プロジェクトをGitHubにプッシュします。

## 手順
1. \`gh repo create your-repo --private\`
2. \`.gitignore\`を確認（.envが除外されていること）
3. \`git add -A && git commit -m "Initial commit"\`
4. \`git push -u origin main\`

## セキュリティチェック
- [ ] .env ファイルが含まれていない
- [ ] APIキーがハードコードされていない
- [ ] 認証情報ファイルが除外されている` },
      chapterId: chapter6.id,
      order: 3,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'deploy-to-vercel',
      title: { en: 'Deploy to Vercel', ja: 'Vercelにデプロイ' },
      description: { en: `Deploy to production with Vercel.

## Steps
1. Import the project at https://vercel.com
2. Configure environment variables
3. Connect PostgreSQL database (Vercel Postgres or external)
4. Run deployment

## Environment Variables to Set
In the Vercel dashboard:
- POSTGRES_URL
- AUTH_SECRET
- BASE_URL
- ENCRYPTION_KEY`, ja: `Vercelでプロダクションデプロイをします。

## 手順
1. https://vercel.com でプロジェクトをインポート
2. 環境変数を設定
3. PostgreSQLデータベースを接続（Vercel Postgres または外部）
4. デプロイを実行

## 環境変数の設定
Vercelダッシュボードで以下を設定:
- POSTGRES_URL
- AUTH_SECRET
- BASE_URL
- ENCRYPTION_KEY` },
      chapterId: chapter6.id,
      order: 4,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'settings-management',
      title: { en: 'Manage Setting Definitions', ja: '設定定義を管理する' },
      description: { en: `Learn how to manage setting definitions for tool unlock conditions.

## Overview
Setting definitions allow you to create configurable settings that users can set, and use them as unlock conditions for tools.

## Key Concepts
- **Setting Definitions**: Metadata about available settings (stored in \`setting_definitions\` table)
- **Tool Settings**: Actual user values (stored in \`user_settings.tool_settings\` JSONB)
- **Encryption**: Sensitive settings (API keys, tokens) are automatically encrypted

## Admin Interface
Navigate to **/admin/settings** to manage setting definitions:
- Create new settings with key, name, description, category, value type
- Mark settings as encrypted for automatic encryption
- Toggle settings active/inactive

## Value Types
- **string**: Plain text values
- **boolean**: True/false toggles
- **apiKey**: API keys (recommended to mark as encrypted)
- **url**: URL values

## Using Settings as Tool Unlock Conditions
1. Define a setting in /admin/settings (e.g., "geminiApiKey")
2. Go to /admin/tools and edit/create a tool
3. In "Unlock Conditions", select the required settings
4. Users must configure those settings to unlock the tool

## Example Settings
| Key | Name | Category | Encrypted |
|-----|------|----------|-----------|
| geminiApiKey | Gemini API Key | ai | Yes |
| serverUrl | Server URL | server | No |`, ja: `ツールのアンロック条件に使用する設定定義の管理方法を学びます。

## 概要
設定定義を使うと、ユーザーが設定可能な項目を作成し、ツールのアンロック条件として使用できます。

## 主要概念
- **設定定義**: 利用可能な設定のメタデータ（\`setting_definitions\` テーブルに保存）
- **ツール設定**: 実際のユーザー値（\`user_settings.tool_settings\` JSONBに保存）
- **暗号化**: 機密設定（APIキー、トークン）は自動的に暗号化

## 管理画面
**/admin/settings** で設定定義を管理：
- キー、名前、説明、カテゴリ、値タイプで新規設定を作成
- 自動暗号化のために設定を暗号化対象としてマーク
- 設定の有効/無効を切り替え

## 値タイプ
- **string**: プレーンテキスト
- **boolean**: True/False トグル
- **apiKey**: APIキー（暗号化推奨）
- **url**: URL値

## ツールアンロック条件としての使用
1. /admin/settings で設定を定義（例: "geminiApiKey"）
2. /admin/tools でツールを編集/作成
3. 「アンロック条件」で必要な設定を選択
4. ユーザーはツールをアンロックするためにそれらの設定を構成する必要がある

## 設定例
| キー | 名前 | カテゴリ | 暗号化 |
|-----|------|----------|--------|
| geminiApiKey | Gemini API Key | ai | はい |
| serverUrl | Server URL | server | いいえ |` },
      chapterId: chapter6.id,
      order: 5,
      category: 'advanced',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター7: Internationalization（多言語化）
    // ----------------------------------------
    {
      slug: 'understand-i18n',
      title: { en: 'Understand the i18n System', ja: '多言語システムを理解する' },
      description: { en: `Learn how the internationalization system works.

## Overview
This app uses a custom i18n system with the following features:
- **LocalizedText type**: \`{ en: string; ja?: string; ko?: string; zh?: string; es?: string }\`
- **Translation files**: Located in \`lib/i18n/locales/*.ts\`
- **useTranslation hook**: Access translations in components

## File Structure
\`\`\`
lib/i18n/
├── index.ts          # useTranslation hook
├── context.tsx       # Language context
└── locales/
    ├── en.ts         # English (base)
    ├── ja.ts         # Japanese
    ├── ko.ts         # Korean
    ├── zh.ts         # Chinese
    └── es.ts         # Spanish
\`\`\`

## How LocalizedText Works
Database fields like \`title\` and \`description\` use JSONB with language keys.`, ja: `多言語システムの仕組みを学びます。

## 概要
このアプリは以下の特徴を持つカスタムi18nシステムを使用しています：
- **LocalizedText型**: \`{ en: string; ja?: string; ko?: string; zh?: string; es?: string }\`
- **翻訳ファイル**: \`lib/i18n/locales/*.ts\` に配置
- **useTranslationフック**: コンポーネントで翻訳にアクセス

## ファイル構造
\`\`\`
lib/i18n/
├── index.ts          # useTranslationフック
├── context.tsx       # 言語コンテキスト
└── locales/
    ├── en.ts         # 英語（ベース）
    ├── ja.ts         # 日本語
    ├── ko.ts         # 韓国語
    ├── zh.ts         # 中国語
    └── es.ts         # スペイン語
\`\`\`

## LocalizedTextの仕組み
\`title\`や\`description\`などのDBフィールドは言語キーを持つJSONBを使用。` },
      chapterId: chapter7.id,
      order: 1,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'switch-language',
      title: { en: 'Switch Language', ja: '言語を切り替える' },
      description: { en: `Change the display language in the settings.

## Steps
1. Go to /dashboard/general
2. Find the "Language" section
3. Select a different language from the dropdown
4. Save your changes

## Supported Languages
- English (en)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Spanish (es)

## Verification
After switching, verify that the UI text changes accordingly.`, ja: `設定画面で表示言語を変更します。

## 手順
1. /dashboard/general にアクセス
2. 「言語」セクションを見つける
3. ドロップダウンから別の言語を選択
4. 変更を保存

## 対応言語
- 英語 (en)
- 日本語 (ja)
- 韓国語 (ko)
- 中国語 (zh)
- スペイン語 (es)

## 確認
切り替え後、UIのテキストが変わることを確認してください。` },
      chapterId: chapter7.id,
      order: 2,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'add-translation-keys',
      title: { en: 'Add Translation Keys', ja: '翻訳キーを追加する' },
      description: { en: `Learn how to add new translation keys.

## Steps
1. Add the key to \`lib/i18n/locales/en.ts\` (base language)
2. Add translations to other locale files (ja.ts, ko.ts, zh.ts, es.ts)
3. Use the key with \`useTranslation\` hook

## Example
\`\`\`typescript
// In en.ts
export const en = {
  mySection: {
    greeting: 'Hello!',
  },
};

// In component
const { t } = useTranslation();
return <p>{t('mySection.greeting')}</p>;
\`\`\`

## Important
All locale files must have the same structure. TypeScript will show errors if keys are missing.`, ja: `新しい翻訳キーの追加方法を学びます。

## 手順
1. \`lib/i18n/locales/en.ts\`（ベース言語）にキーを追加
2. 他のロケールファイル（ja.ts, ko.ts, zh.ts, es.ts）に翻訳を追加
3. \`useTranslation\`フックでキーを使用

## 例
\`\`\`typescript
// en.ts内
export const en = {
  mySection: {
    greeting: 'Hello!',
  },
};

// コンポーネント内
const { t } = useTranslation();
return <p>{t('mySection.greeting')}</p>;
\`\`\`

## 重要
すべてのロケールファイルは同じ構造でなければなりません。キーが不足している場合、TypeScriptがエラーを表示します。` },
      chapterId: chapter7.id,
      order: 3,
      category: 'advanced',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター8: Content Structure（コンテンツ構造）
    // ----------------------------------------
    {
      slug: 'understand-book-structure',
      title: { en: 'Understand Book Structure', ja: 'ブック構造を理解する' },
      description: { en: `Learn the hierarchical content structure.

## Hierarchy
\`\`\`
Book (optional)
└── Chapter
    └── Quest
\`\`\`

## Books
- Group related chapters together
- Have their own title, description, and cover image
- Optional: Quests can exist without being in a book

## Chapters
- Organize quests into logical groups
- Each chapter has an order number
- Chapters can belong to a book

## Quests
- The core learning unit
- Must belong to a chapter
- Can have prerequisites (other quests)`, ja: `階層的なコンテンツ構造を学びます。

## 階層
\`\`\`
ブック（オプション）
└── チャプター
    └── クエスト
\`\`\`

## ブック
- 関連するチャプターをグループ化
- タイトル、説明、カバー画像を持つ
- オプション：クエストはブックなしでも存在可能

## チャプター
- クエストを論理的にグループ化
- 各チャプターには順序番号がある
- チャプターはブックに所属可能

## クエスト
- 学習の基本単位
- チャプターに所属が必須
- 前提条件（他のクエスト）を設定可能` },
      chapterId: chapter8.id,
      order: 1,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'create-book',
      title: { en: 'Create a Book', ja: 'ブックを作成する' },
      description: { en: `Create a book to organize chapters.

## Steps
1. Go to /admin and click "Books" in the sidebar
2. Click "New Book"
3. Fill in the details:
   - **Slug**: URL-friendly identifier (e.g., "getting-started")
   - **Title**: Display name in each language
   - **Description**: Overview of the book
   - **Cover Image**: Optional cover image URL
4. Save the book

## Verification
After creating, verify the book appears in the admin list.`, ja: `チャプターを整理するためにブックを作成します。

## 手順
1. /admin にアクセスし、サイドバーの「Books」をクリック
2. 「New Book」をクリック
3. 詳細を入力：
   - **Slug**: URL用識別子（例：「getting-started」）
   - **Title**: 各言語での表示名
   - **Description**: ブックの概要
   - **Cover Image**: カバー画像URL（オプション）
4. ブックを保存

## 確認
作成後、管理画面のリストにブックが表示されることを確認。` },
      chapterId: chapter8.id,
      order: 2,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'create-chapter',
      title: { en: 'Create a Chapter', ja: 'チャプターを作成する' },
      description: { en: `Create a chapter to organize quests.

## Steps
1. Go to /admin and navigate to a book or the chapters section
2. Click "New Chapter"
3. Fill in the details:
   - **Slug**: URL-friendly identifier
   - **Title**: Display name in each language
   - **Description**: Overview of the chapter
   - **Book**: Optionally assign to a book
   - **Order**: Position in the list
4. Save the chapter

## Verification
Create a chapter and verify it appears in the correct order.`, ja: `クエストを整理するためにチャプターを作成します。

## 手順
1. /admin にアクセスし、ブックまたはチャプターセクションに移動
2. 「New Chapter」をクリック
3. 詳細を入力：
   - **Slug**: URL用識別子
   - **Title**: 各言語での表示名
   - **Description**: チャプターの概要
   - **Book**: ブックへの割り当て（オプション）
   - **Order**: リスト内の位置
4. チャプターを保存

## 確認
チャプターを作成し、正しい順序で表示されることを確認。` },
      chapterId: chapter8.id,
      order: 3,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'organize-quests',
      title: { en: 'Organize Quests', ja: 'クエストを整理する' },
      description: { en: `Learn how to organize quests effectively.

## Quest Properties
- **Chapter**: Which chapter the quest belongs to
- **Order**: Position within the chapter
- **Prerequisite**: Quest that must be completed first

## Setting Prerequisites
1. Edit a quest in /admin/quests
2. Select a prerequisite quest from the dropdown
3. Users must complete the prerequisite before starting this quest

## Best Practices
- Use logical ordering within chapters
- Set prerequisites for dependent quests
- Group related quests in the same chapter`, ja: `クエストを効果的に整理する方法を学びます。

## クエストのプロパティ
- **Chapter**: クエストが所属するチャプター
- **Order**: チャプター内での位置
- **Prerequisite**: 先に完了が必要なクエスト

## 前提条件の設定
1. /admin/quests でクエストを編集
2. ドロップダウンから前提クエストを選択
3. ユーザーは前提クエストを完了してからこのクエストを開始できる

## ベストプラクティス
- チャプター内で論理的な順序を使用
- 依存関係のあるクエストには前提条件を設定
- 関連するクエストは同じチャプターにグループ化` },
      chapterId: chapter8.id,
      order: 4,
      category: 'advanced',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター9: Rewards（リワード）
    // ----------------------------------------
    {
      slug: 'understand-rewards',
      title: { en: 'Understand the Reward System', ja: 'リワードシステムを理解する' },
      description: { en: `Learn how the reward system works.

## Reward Types
- **Badge**: Visual achievements displayed on the user profile
- **Coin**: Virtual currency that can be earned and spent
- **Perk**: Special features or bonuses unlocked

## Condition Types
- **Quest**: Awarded when a specific quest is completed
- **Chapter**: Awarded when all quests in a chapter are completed
- **Book**: Awarded when all quests in a book are completed
- **Custom**: Awarded based on custom conditions (multiple quests, etc.)

## How It Works
1. User completes a quest
2. System checks all active rewards
3. Rewards with satisfied conditions are automatically granted
4. Activity log records the reward acquisition`, ja: `リワードシステムの仕組みを学びます。

## リワードの種類
- **バッジ**: ユーザープロフィールに表示される視覚的な実績
- **コイン**: 獲得して使える仮想通貨
- **特典**: アンロックされる特別な機能やボーナス

## 条件タイプ
- **Quest**: 特定のクエスト完了時に付与
- **Chapter**: チャプター内の全クエスト完了時に付与
- **Book**: ブック内の全クエスト完了時に付与
- **Custom**: カスタム条件（複数クエストなど）に基づいて付与

## 仕組み
1. ユーザーがクエストを完了
2. システムがすべてのアクティブなリワードをチェック
3. 条件を満たしたリワードが自動的に付与
4. アクティビティログにリワード獲得を記録` },
      chapterId: chapter9.id,
      order: 1,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'check-rewards-page',
      title: { en: 'Check the Rewards Page', ja: 'リワードページを確認する' },
      description: { en: `Explore the user rewards page.

## Steps
1. Go to /dashboard/rewards
2. View your current coin balance
3. Browse earned and locked badges
4. Check available perks

## Page Sections
- **Coins Card**: Shows your current coin balance
- **Badges Section**: Grid of earned and locked badges
- **Perks Section**: List of special features and their status

## Verification
Navigate to the rewards page and familiarize yourself with the layout.`, ja: `ユーザーリワードページを探索します。

## 手順
1. /dashboard/rewards にアクセス
2. 現在のコイン残高を確認
3. 獲得済みと未獲得のバッジを閲覧
4. 利用可能な特典を確認

## ページセクション
- **コインカード**: 現在のコイン残高を表示
- **バッジセクション**: 獲得済みと未獲得バッジのグリッド
- **特典セクション**: 特別機能とそのステータスのリスト

## 確認
リワードページに移動し、レイアウトに慣れてください。` },
      chapterId: chapter9.id,
      order: 2,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'create-reward',
      title: { en: 'Create a Reward', ja: 'リワードを作成する' },
      description: { en: `Create a new reward in the admin panel.

## Steps
1. Go to /admin/rewards
2. Click "New Reward"
3. Fill in the details:
   - **Slug**: Unique identifier (e.g., "first-quest-badge")
   - **Title**: Display name in each language
   - **Type**: Badge, Coin, or Perk
   - **Value**: For coins, the amount to award
   - **Icon URL**: Optional icon image
4. Save the reward

## Next Step
After creating, set the condition in the next quest.`, ja: `管理画面で新しいリワードを作成します。

## 手順
1. /admin/rewards にアクセス
2. 「New Reward」をクリック
3. 詳細を入力：
   - **Slug**: 一意の識別子（例：「first-quest-badge」）
   - **Title**: 各言語での表示名
   - **Type**: バッジ、コイン、または特典
   - **Value**: コインの場合、付与する量
   - **Icon URL**: アイコン画像（オプション）
4. リワードを保存

## 次のステップ
作成後、次のクエストで条件を設定します。` },
      chapterId: chapter9.id,
      order: 3,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'set-reward-conditions',
      title: { en: 'Set Reward Conditions', ja: 'リワード条件を設定する' },
      description: { en: `Configure when rewards are granted.

## Condition Types

### Quest Condition
- Granted when a specific quest is completed
- Select the quest from the dropdown

### Chapter Condition
- Granted when all quests in a chapter are completed
- Select the chapter from the dropdown

### Book Condition
- Granted when all quests in a book are completed
- Select the book from the dropdown

### Custom Condition
- Granted based on multiple quests
- Select multiple quests
- Choose "Require All" or "Require Any"

## Steps
1. Edit a reward in /admin/rewards
2. Select the condition type
3. Configure the specific condition
4. Save the reward`, ja: `リワードが付与される条件を設定します。

## 条件タイプ

### クエスト条件
- 特定のクエスト完了時に付与
- ドロップダウンからクエストを選択

### チャプター条件
- チャプター内の全クエスト完了時に付与
- ドロップダウンからチャプターを選択

### ブック条件
- ブック内の全クエスト完了時に付与
- ドロップダウンからブックを選択

### カスタム条件
- 複数のクエストに基づいて付与
- 複数のクエストを選択
- 「すべて必須」または「いずれか」を選択

## 手順
1. /admin/rewards でリワードを編集
2. 条件タイプを選択
3. 具体的な条件を設定
4. リワードを保存` },
      chapterId: chapter9.id,
      order: 4,
      category: 'advanced',
      verificationType: 'manual',
    },

    // ----------------------------------------
    // チャプター10: Team & Security（チーム・セキュリティ）
    // ----------------------------------------
    {
      slug: 'create-team',
      title: { en: 'Create a Team', ja: 'チームを作成する' },
      description: { en: `Create a team and invite members.

## Steps
1. Go to /dashboard/team
2. If you don't have a team, create one
3. Enter a team name
4. Save the team

## Team Features
- Share progress with team members
- Collaborate on quests
- Manage team roles

## Verification
Create a team and verify it appears in your dashboard.`, ja: `チームを作成してメンバーを招待します。

## 手順
1. /dashboard/team にアクセス
2. チームがなければ作成
3. チーム名を入力
4. チームを保存

## チーム機能
- チームメンバーと進捗を共有
- クエストで協力
- チームロールを管理

## 確認
チームを作成し、ダッシュボードに表示されることを確認。` },
      chapterId: chapter10.id,
      order: 1,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'invite-team-member',
      title: { en: 'Invite Team Members', ja: 'メンバーを招待する' },
      description: { en: `Invite others to join your team.

## Steps
1. Go to /dashboard/team
2. Click "Invite Member"
3. Enter the email address
4. Select a role (member or admin)
5. Send the invitation

## Roles
- **Member**: Can view team progress
- **Admin**: Can manage team settings and members

## Invitation Process
1. Invitation email is sent
2. User clicks the link
3. User creates an account (if needed)
4. User joins the team

## Verification
Send an invitation and verify it appears in pending invitations.`, ja: `他のユーザーをチームに招待します。

## 手順
1. /dashboard/team にアクセス
2. 「Invite Member」をクリック
3. メールアドレスを入力
4. ロールを選択（メンバーまたは管理者）
5. 招待を送信

## ロール
- **メンバー**: チームの進捗を閲覧可能
- **管理者**: チーム設定とメンバーを管理可能

## 招待プロセス
1. 招待メールが送信される
2. ユーザーがリンクをクリック
3. ユーザーがアカウントを作成（必要な場合）
4. ユーザーがチームに参加

## 確認
招待を送信し、保留中の招待に表示されることを確認。` },
      chapterId: chapter10.id,
      order: 2,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'change-password',
      title: { en: 'Change Password', ja: 'パスワードを変更する' },
      description: { en: `Update your account password.

## Steps
1. Go to /dashboard/security
2. Enter your current password
3. Enter your new password
4. Confirm the new password
5. Click "Update Password"

## Password Requirements
- Minimum 8 characters recommended
- Use a mix of letters, numbers, and symbols

## Verification
Change your password and verify you can log in with the new password.`, ja: `アカウントのパスワードを更新します。

## 手順
1. /dashboard/security にアクセス
2. 現在のパスワードを入力
3. 新しいパスワードを入力
4. 新しいパスワードを確認
5. 「Update Password」をクリック

## パスワード要件
- 8文字以上推奨
- 文字、数字、記号を組み合わせる

## 確認
パスワードを変更し、新しいパスワードでログインできることを確認。` },
      chapterId: chapter10.id,
      order: 3,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'view-activity-log',
      title: { en: 'View Activity Log', ja: 'アクティビティログを確認する' },
      description: { en: `Monitor your account activity.

## Steps
1. Go to /dashboard/activity
2. View recent activities

## Activity Types
- **Sign Up**: Account creation
- **Sign In**: Login events
- **Sign Out**: Logout events
- **Update Password**: Password changes
- **Update Account**: Profile updates
- **Quest Completed**: Quest completions
- **Reward Earned**: Reward acquisitions

## Information Shown
- Activity type with icon
- IP address (if available)
- Relative timestamp

## Verification
Perform some activities and verify they appear in the log.`, ja: `アカウントのアクティビティを監視します。

## 手順
1. /dashboard/activity にアクセス
2. 最近のアクティビティを確認

## アクティビティの種類
- **Sign Up**: アカウント作成
- **Sign In**: ログインイベント
- **Sign Out**: ログアウトイベント
- **Update Password**: パスワード変更
- **Update Account**: プロフィール更新
- **Quest Completed**: クエスト完了
- **Reward Earned**: リワード獲得

## 表示される情報
- アイコン付きのアクティビティタイプ
- IPアドレス（利用可能な場合）
- 相対的なタイムスタンプ

## 確認
いくつかのアクティビティを行い、ログに表示されることを確認。` },
      chapterId: chapter10.id,
      order: 4,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'configure-external-server',
      title: { en: 'Configure External Server', ja: '外部サーバーを設定する' },
      description: { en: `Set up an external server for advanced verification features.

## Overview
The external server feature allows quests to verify user actions against your own server. This is useful for:
- Verifying that users have set up their own services
- Testing webhook integrations
- Custom verification logic

## Steps
1. Go to /dashboard/server-config
2. Enter your server URL (must be HTTPS for production)
3. Click "Test Connection" to verify reachability
4. Generate and save the verification token
5. Configure your server to accept the token

## Security Features
- **HTTPS Required**: Production URLs must use HTTPS
- **localhost Allowed**: For development, localhost and 127.0.0.1 are allowed
- **Private IP Blocked**: Private network ranges (10.x, 192.168.x, etc.) are blocked
- **Token Verification**: Secure token exchange for server authentication

## Your Server Requirements
Your server must implement the \`/api/saas-quest/status\` endpoint that returns:
\`\`\`json
{ "status": "ok" }
\`\`\`

## Verification
Complete this quest when your server is configured and the connection test succeeds.`, ja: `高度な検証機能のための外部サーバーを設定します。

## 概要
外部サーバー機能により、クエストはユーザーのアクションを独自のサーバーに対して検証できます。以下に便利です：
- ユーザーが自分のサービスをセットアップしたことを検証
- Webhook連携のテスト
- カスタム検証ロジック

## 手順
1. /dashboard/server-config にアクセス
2. サーバーURLを入力（本番ではHTTPS必須）
3. 「Test Connection」をクリックして到達性を確認
4. 検証トークンを生成して保存
5. サーバーでトークンを受け入れるよう設定

## セキュリティ機能
- **HTTPS必須**: 本番URLはHTTPSを使用する必要がある
- **localhost許可**: 開発用にlocalhostと127.0.0.1は許可
- **プライベートIPブロック**: プライベートネットワーク範囲（10.x, 192.168.x 等）はブロック
- **トークン検証**: サーバー認証のためのセキュアなトークン交換

## サーバー要件
サーバーは \`/api/saas-quest/status\` エンドポイントを実装し、以下を返す必要があります：
\`\`\`json
{ "status": "ok" }
\`\`\`

## 確認
サーバーが設定され、接続テストが成功したらこのクエストを完了してください。` },
      chapterId: chapter10.id,
      order: 5,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'understand-ssrf-protection',
      title: { en: 'Understand SSRF Protection', ja: 'SSRF対策を理解する' },
      description: { en: `Learn how the application protects against Server-Side Request Forgery (SSRF) attacks.

## What is SSRF?
SSRF (Server-Side Request Forgery) is an attack where an attacker tricks the server into making requests to unintended locations:
- Internal network resources (192.168.x.x, 10.x.x.x)
- Cloud metadata endpoints (169.254.169.254)
- Internal services (localhost, internal DNS)

## Protection Measures

### 1. URL Validation
Before any external request, URLs are validated:
- Protocol check (HTTPS required for production)
- Hostname validation
- Private IP detection

### 2. Blocked Addresses
The following are blocked:
- **IPv4 Private**: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- **IPv4 Link-local**: 169.254.0.0/16
- **IPv4 Loopback**: 127.x.x.x (except 127.0.0.1 for dev)
- **IPv6 Private**: fd00::/8, fc00::/8
- **IPv6 Link-local**: fe80::/10
- **Internal Domains**: .local, .internal, .corp, .lan

### 3. Development Exception
For local development:
- localhost, 127.0.0.1, and ::1 are allowed with HTTP
- Other private addresses remain blocked

## Where Protection is Applied
- Server URL configuration (PUT /api/user/server-config)
- Connection testing (POST /api/user/server-config)
- Server status verification in quests
- Webhook URL validation

## Verification
Review the code in \`app/api/user/server-config/route.ts\` to understand the implementation.`, ja: `アプリケーションがServer-Side Request Forgery (SSRF) 攻撃からどのように保護されているかを学びます。

## SSRFとは
SSRF（Server-Side Request Forgery）は、攻撃者がサーバーを騙して意図しない場所にリクエストを送信させる攻撃です：
- 内部ネットワークリソース（192.168.x.x, 10.x.x.x）
- クラウドメタデータエンドポイント（169.254.169.254）
- 内部サービス（localhost, 内部DNS）

## 保護対策

### 1. URL検証
外部リクエストの前にURLを検証：
- プロトコルチェック（本番はHTTPS必須）
- ホスト名検証
- プライベートIP検出

### 2. ブロックされるアドレス
以下がブロックされます：
- **IPv4プライベート**: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- **IPv4リンクローカル**: 169.254.0.0/16
- **IPv4ループバック**: 127.x.x.x（開発用の127.0.0.1を除く）
- **IPv6プライベート**: fd00::/8, fc00::/8
- **IPv6リンクローカル**: fe80::/10
- **内部ドメイン**: .local, .internal, .corp, .lan

### 3. 開発用例外
ローカル開発用：
- localhost, 127.0.0.1, ::1 はHTTPで許可
- その他のプライベートアドレスはブロック

## 保護が適用される場所
- サーバーURL設定（PUT /api/user/server-config）
- 接続テスト（POST /api/user/server-config）
- クエストでのサーバーステータス検証
- Webhook URL検証

## 確認
\`app/api/user/server-config/route.ts\` のコードをレビューして実装を理解してください。` },
      chapterId: chapter10.id,
      order: 6,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'understand-api-key-encryption',
      title: { en: 'Understand API Key Encryption', ja: 'APIキー暗号化を理解する' },
      description: { en: `Learn how sensitive data like API keys are encrypted in the database.

## Overview
API keys, tokens, and other sensitive settings are encrypted before being stored in the database. This protects user data even if the database is compromised.

## How It Works

### 1. Encryption Algorithm
- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Size**: 256-bit (32 bytes)
- **IV**: Random 12-byte initialization vector per encryption
- **Auth Tag**: 16-byte authentication tag for integrity

### 2. Storage Format
Encrypted values are stored as:
\`\`\`
encrypted:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>
\`\`\`

### 3. Automatic Detection
- Setting definitions marked as \`isEncrypted: true\` are automatically encrypted
- The system maintains a cache of encrypted keys for performance
- Values with "encrypted:" prefix are automatically decrypted when read

## Setting Up Encryption

### 1. Generate Key
\`\`\`bash
openssl rand -hex 32
\`\`\`

### 2. Add to Environment
\`\`\`
ENCRYPTION_KEY=your_64_character_hex_string
\`\`\`

### 3. Mark Settings as Encrypted
In /admin/settings, enable "Encrypted" for sensitive settings.

## Best Practices
- Never log or display encrypted values
- Rotate encryption key periodically
- Mark all API keys and tokens as encrypted
- Use valueType "apiKey" for visual hints

## Verification
Create a test setting marked as encrypted and verify the value is stored encrypted in the database.`, ja: `APIキーなどの機密データがデータベースでどのように暗号化されているかを学びます。

## 概要
APIキー、トークン、その他の機密設定は、データベースに保存される前に暗号化されます。これによりデータベースが侵害された場合でもユーザーデータを保護します。

## 仕組み

### 1. 暗号化アルゴリズム
- **アルゴリズム**: AES-256-GCM（Advanced Encryption Standard with Galois/Counter Mode）
- **キーサイズ**: 256ビット（32バイト）
- **IV**: 暗号化ごとにランダムな12バイトの初期化ベクトル
- **認証タグ**: 整合性のための16バイトの認証タグ

### 2. 保存形式
暗号化された値は以下の形式で保存：
\`\`\`
encrypted:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>
\`\`\`

### 3. 自動検出
- \`isEncrypted: true\` とマークされた設定定義は自動的に暗号化
- システムはパフォーマンスのため暗号化キーのキャッシュを維持
- "encrypted:" プレフィックス付きの値は読み込み時に自動的に復号化

## 暗号化のセットアップ

### 1. キーを生成
\`\`\`bash
openssl rand -hex 32
\`\`\`

### 2. 環境変数に追加
\`\`\`
ENCRYPTION_KEY=64文字の16進文字列
\`\`\`

### 3. 設定を暗号化対象にマーク
/admin/settings で機密設定の「Encrypted」を有効化。

## ベストプラクティス
- 暗号化された値はログや画面に出力しない
- 定期的に暗号化キーをローテーション
- すべてのAPIキーとトークンを暗号化対象に
- 視覚的ヒントとしてvalueType "apiKey" を使用

## 確認
暗号化対象としてマークしたテスト設定を作成し、データベースで値が暗号化されて保存されることを確認してください。` },
      chapterId: chapter10.id,
      order: 7,
      category: 'advanced',
      verificationType: 'manual',
    },
  ];

  await db.insert(quests).values(allQuests);

  console.log(`Created 10 chapters and ${allQuests.length} quests.`);
}

seedAllQuests()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed finished.');
    process.exit(0);
  });
