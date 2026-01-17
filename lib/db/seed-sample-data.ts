import { db } from './drizzle';
import {
  books,
  chapters,
  quests,
  questDocuments,
  chatMessages,
  chatSessions,
  userQuestProgress,
} from './schema';

/**
 * サンプルデータを投入するスクリプト
 * ブック、チャプター、クエスト、ドキュメントの完全なサンプルセットを作成
 *
 * 使用方法: pnpm db:seed:sample
 */
async function seedSampleData() {
  console.log('Creating sample data (books, chapters, quests, documents)...');

  // 既存のデータを削除（外部キー制約順）
  console.log('Clearing existing data...');
  await db.delete(chatMessages);
  await db.delete(chatSessions);
  await db.delete(userQuestProgress);
  await db.delete(questDocuments);
  await db.delete(quests);
  await db.delete(chapters);
  await db.delete(books);

  // ========================================
  // ブック作成
  // ========================================
  console.log('Creating books...');

  const [book1] = await db.insert(books).values({
    slug: 'getting-started',
    title: { en: 'Getting Started', ja: '入門ガイド' },
    description: {
      en: 'Learn the basics of SaaS Quest and get your development environment ready.',
      ja: 'SaaS Questの基礎を学び、開発環境を準備します。',
    },
    order: 1,
  }).returning();

  const [book2] = await db.insert(books).values({
    slug: 'advanced-topics',
    title: { en: 'Advanced Topics', ja: '応用編' },
    description: {
      en: 'Deep dive into advanced features like AI integration, automation, and deployment.',
      ja: 'AI統合、自動化、デプロイメントなどの高度な機能を学びます。',
    },
    order: 2,
  }).returning();

  console.log(`Created ${2} books`);

  // ========================================
  // チャプター作成
  // ========================================
  console.log('Creating chapters...');

  // Book 1 のチャプター
  const [chapter1] = await db.insert(chapters).values({
    slug: 'environment-setup',
    title: { en: 'Environment Setup', ja: '環境構築' },
    description: {
      en: 'Set up your local development environment with all required tools.',
      ja: 'ローカル開発環境に必要なツールをすべてセットアップします。',
    },
    bookId: book1.id,
    order: 1,
  }).returning();

  const [chapter2] = await db.insert(chapters).values({
    slug: 'first-steps',
    title: { en: 'First Steps', ja: '最初のステップ' },
    description: {
      en: 'Take your first steps with the application and learn core concepts.',
      ja: 'アプリケーションで最初の一歩を踏み出し、基本概念を学びます。',
    },
    bookId: book1.id,
    order: 2,
  }).returning();

  // Book 2 のチャプター
  const [chapter3] = await db.insert(chapters).values({
    slug: 'ai-integration',
    title: { en: 'AI Integration', ja: 'AI統合' },
    description: {
      en: 'Integrate AI capabilities using Gemini API and RAG system.',
      ja: 'Gemini APIとRAGシステムを使用してAI機能を統合します。',
    },
    bookId: book2.id,
    order: 1,
  }).returning();

  const [chapter4] = await db.insert(chapters).values({
    slug: 'deployment',
    title: { en: 'Deployment', ja: 'デプロイメント' },
    description: {
      en: 'Deploy your application to production and configure hosting.',
      ja: 'アプリケーションを本番環境にデプロイし、ホスティングを設定します。',
    },
    bookId: book2.id,
    order: 2,
  }).returning();

  console.log(`Created ${4} chapters`);

  // ========================================
  // クエスト作成
  // ========================================
  console.log('Creating quests...');

  const allQuests = [
    // Chapter 1: Environment Setup
    {
      slug: 'install-nodejs',
      title: { en: 'Install Node.js', ja: 'Node.jsをインストール' },
      description: {
        en: `Install Node.js LTS version on your machine.

## Steps
1. Visit https://nodejs.org/
2. Download the LTS version
3. Run the installer
4. Verify with \`node --version\`

## Requirements
- Node.js 18.x or higher recommended`,
        ja: `マシンにNode.js LTSバージョンをインストールします。

## 手順
1. https://nodejs.org/ にアクセス
2. LTSバージョンをダウンロード
3. インストーラーを実行
4. \`node --version\` で確認

## 要件
- Node.js 18.x以上推奨`,
      },
      chapterId: chapter1.id,
      order: 1,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'install-docker',
      title: { en: 'Install Docker', ja: 'Dockerをインストール' },
      description: {
        en: `Install Docker Desktop for container management.

## Steps
1. Visit https://docker.com/
2. Download Docker Desktop
3. Install and start Docker
4. Verify with \`docker --version\``,
        ja: `コンテナ管理用にDocker Desktopをインストールします。

## 手順
1. https://docker.com/ にアクセス
2. Docker Desktopをダウンロード
3. インストールして起動
4. \`docker --version\` で確認`,
      },
      chapterId: chapter1.id,
      order: 2,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'setup-database',
      title: { en: 'Set Up Database', ja: 'データベースをセットアップ' },
      description: {
        en: `Create a PostgreSQL database using Docker.

## docker-compose.yml
\`\`\`yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saas_quest
\`\`\``,
        ja: `Dockerを使用してPostgreSQLデータベースを作成します。

## docker-compose.yml
\`\`\`yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saas_quest
\`\`\``,
      },
      chapterId: chapter1.id,
      order: 3,
      category: 'setup',
      verificationType: 'manual',
    },

    // Chapter 2: First Steps
    {
      slug: 'create-account',
      title: { en: 'Create an Account', ja: 'アカウントを作成' },
      description: {
        en: `Register your first user account.

## Steps
1. Navigate to /sign-up
2. Enter your email and password
3. Submit the form
4. Verify login works`,
        ja: `最初のユーザーアカウントを登録します。

## 手順
1. /sign-up にアクセス
2. メールとパスワードを入力
3. フォームを送信
4. ログインできることを確認`,
      },
      chapterId: chapter2.id,
      order: 1,
      category: 'setup',
      verificationType: 'manual',
    },
    {
      slug: 'explore-dashboard',
      title: { en: 'Explore the Dashboard', ja: 'ダッシュボードを探索' },
      description: {
        en: `Familiarize yourself with the dashboard layout and features.

## Areas to Explore
- Quest list
- Progress tracking
- Settings page
- Team management`,
        ja: `ダッシュボードのレイアウトと機能に慣れましょう。

## 確認するエリア
- クエスト一覧
- 進捗追跡
- 設定ページ
- チーム管理`,
      },
      chapterId: chapter2.id,
      order: 2,
      category: 'setup',
      verificationType: 'manual',
    },

    // Chapter 3: AI Integration
    {
      slug: 'get-api-key',
      title: { en: 'Get Gemini API Key', ja: 'Gemini APIキーを取得' },
      description: {
        en: `Obtain an API key from Google AI Studio.

## Steps
1. Visit https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key"
4. Create and copy your key`,
        ja: `Google AI StudioからAPIキーを取得します。

## 手順
1. https://aistudio.google.com/ にアクセス
2. Googleアカウントでサインイン
3. 「Get API Key」をクリック
4. キーを作成してコピー`,
      },
      chapterId: chapter3.id,
      order: 1,
      category: 'integration',
      verificationType: 'api_key',
    },
    {
      slug: 'configure-ai',
      title: { en: 'Configure AI Settings', ja: 'AI設定を構成' },
      description: {
        en: `Enable AI chat in your settings.

## Steps
1. Go to Settings > General
2. Enter your Gemini API key
3. Select a model
4. Enable AI Chat toggle`,
        ja: `設定でAIチャットを有効化します。

## 手順
1. 設定 > 一般 に移動
2. Gemini APIキーを入力
3. モデルを選択
4. AIチャットを有効化`,
      },
      chapterId: chapter3.id,
      order: 2,
      category: 'integration',
      verificationType: 'manual',
    },
    {
      slug: 'test-ai-chat',
      title: { en: 'Test AI Chat', ja: 'AIチャットをテスト' },
      description: {
        en: `Try the AI chat feature on a quest page.

## Steps
1. Open any quest detail page
2. Ask a question in the chat
3. Verify you receive a helpful response`,
        ja: `クエストページでAIチャット機能を試します。

## 手順
1. クエスト詳細ページを開く
2. チャットで質問する
3. 役立つ回答が返ることを確認`,
      },
      chapterId: chapter3.id,
      order: 3,
      category: 'integration',
      verificationType: 'manual',
    },

    // Chapter 4: Deployment
    {
      slug: 'prepare-production',
      title: { en: 'Prepare for Production', ja: '本番環境を準備' },
      description: {
        en: `Prepare your application for production deployment.

## Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security settings reviewed
- [ ] Error handling tested`,
        ja: `本番デプロイメントのためにアプリケーションを準備します。

## チェックリスト
- [ ] 環境変数を設定
- [ ] データベースマイグレーションを適用
- [ ] セキュリティ設定を確認
- [ ] エラーハンドリングをテスト`,
      },
      chapterId: chapter4.id,
      order: 1,
      category: 'advanced',
      verificationType: 'manual',
    },
    {
      slug: 'deploy-vercel',
      title: { en: 'Deploy to Vercel', ja: 'Vercelにデプロイ' },
      description: {
        en: `Deploy your application to Vercel.

## Steps
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy and verify`,
        ja: `アプリケーションをVercelにデプロイします。

## 手順
1. GitHubリポジトリを接続
2. 環境変数を設定
3. デプロイして確認`,
      },
      chapterId: chapter4.id,
      order: 2,
      category: 'advanced',
      verificationType: 'manual',
    },
  ];

  await db.insert(quests).values(allQuests);
  console.log(`Created ${allQuests.length} quests`);

  // ========================================
  // ドキュメント作成（embeddingなし - import時と同様）
  // ========================================
  console.log('Creating documents...');

  // クエストIDを取得
  const questMap = new Map<string, number>();
  const allQuestRows = await db.select({ id: quests.id, slug: quests.slug }).from(quests);
  for (const q of allQuestRows) {
    questMap.set(q.slug, q.id);
  }

  // ブック用ドキュメント
  const bookDocuments = [
    {
      bookId: book1.id,
      title: { en: 'Getting Started Overview', ja: '入門ガイド概要' },
      content: {
        en: `Welcome to the Getting Started guide!

This book covers everything you need to set up your development environment and take your first steps with SaaS Quest.

## What You'll Learn
- How to install required tools (Node.js, Docker)
- Setting up a local database
- Creating your first account
- Navigating the dashboard

## Prerequisites
- Basic command line knowledge
- A computer with internet access

Let's begin your journey!`,
        ja: `入門ガイドへようこそ！

このブックでは、開発環境のセットアップとSaaS Questでの最初のステップに必要なすべてをカバーします。

## 学ぶこと
- 必要なツールのインストール（Node.js、Docker）
- ローカルデータベースのセットアップ
- 最初のアカウント作成
- ダッシュボードのナビゲーション

## 前提条件
- 基本的なコマンドライン知識
- インターネット接続のあるコンピュータ

さあ、旅を始めましょう！`,
      },
      contentType: 'guide',
    },
    {
      bookId: book2.id,
      title: { en: 'Advanced Topics Overview', ja: '応用編概要' },
      content: {
        en: `Welcome to Advanced Topics!

This book explores powerful features that take your SaaS application to the next level.

## Topics Covered
- AI Integration with Gemini API
- RAG (Retrieval-Augmented Generation)
- Production deployment
- Performance optimization

## Prerequisites
- Completed "Getting Started" book
- Basic understanding of APIs`,
        ja: `応用編へようこそ！

このブックでは、SaaSアプリケーションを次のレベルに引き上げる強力な機能を探ります。

## カバーするトピック
- Gemini APIとのAI統合
- RAG（検索拡張生成）
- 本番デプロイメント
- パフォーマンス最適化

## 前提条件
- 「入門ガイド」ブックを完了
- APIの基本的な理解`,
      },
      contentType: 'guide',
    },
  ];

  // チャプター用ドキュメント
  const chapterDocuments = [
    {
      chapterId: chapter1.id,
      title: { en: 'Environment Setup FAQ', ja: '環境構築FAQ' },
      content: {
        en: `## Frequently Asked Questions

### Q: Which Node.js version should I use?
A: We recommend Node.js 18.x LTS or higher for best compatibility.

### Q: Can I use a different database?
A: The application is designed for PostgreSQL with pgvector. Other databases are not currently supported.

### Q: Docker is slow on my machine
A: Try allocating more resources in Docker Desktop settings. 4GB RAM minimum recommended.`,
        ja: `## よくある質問

### Q: どのNode.jsバージョンを使うべきですか？
A: 最高の互換性のためにNode.js 18.x LTS以上を推奨します。

### Q: 別のデータベースを使えますか？
A: アプリケーションはpgvector付きのPostgreSQL用に設計されています。他のデータベースは現在サポートされていません。

### Q: Dockerがマシンで遅いです
A: Docker Desktop設定でより多くのリソースを割り当ててみてください。最低4GB RAMを推奨。`,
      },
      contentType: 'faq',
    },
    {
      chapterId: chapter3.id,
      title: { en: 'AI Integration Best Practices', ja: 'AI統合のベストプラクティス' },
      content: {
        en: `## Best Practices for AI Integration

### API Key Security
- Never commit API keys to version control
- Use environment variables
- Rotate keys periodically

### Cost Management
- Start with gemini-2.5-flash-lite for development
- Monitor usage in Google AI Studio
- Set up billing alerts

### Performance Tips
- Cache embeddings when possible
- Batch requests to reduce latency
- Use streaming for long responses`,
        ja: `## AI統合のベストプラクティス

### APIキーのセキュリティ
- APIキーをバージョン管理にコミットしない
- 環境変数を使用する
- 定期的にキーをローテーション

### コスト管理
- 開発にはgemini-2.5-flash-liteから始める
- Google AI Studioで使用量を監視
- 請求アラートを設定

### パフォーマンスのヒント
- 可能な場合はembeddingをキャッシュ
- リクエストをバッチ処理してレイテンシを削減
- 長い回答にはストリーミングを使用`,
      },
      contentType: 'guide',
    },
  ];

  // クエスト用ドキュメント
  const questDocumentsData = [
    {
      questId: questMap.get('install-nodejs'),
      title: { en: 'Node.js Installation Troubleshooting', ja: 'Node.jsインストールのトラブルシューティング' },
      content: {
        en: `## Common Installation Issues

### "node" is not recognized
- Restart your terminal after installation
- Check if Node.js was added to PATH
- Reinstall with the option to add to PATH

### Permission errors on macOS/Linux
- Use nvm (Node Version Manager) instead
- Avoid using sudo for npm global installs

### Version mismatch
- Use nvm to manage multiple versions
- Check .nvmrc file for project requirements`,
        ja: `## よくあるインストール問題

### "node"が認識されない
- インストール後にターミナルを再起動
- Node.jsがPATHに追加されているか確認
- PATHに追加するオプションで再インストール

### macOS/Linuxでの権限エラー
- 代わりにnvm（Node Version Manager）を使用
- npm globalインストールにsudoを使わない

### バージョンの不一致
- nvmで複数バージョンを管理
- プロジェクト要件の.nvmrcファイルを確認`,
      },
      contentType: 'troubleshoot',
    },
    {
      questId: questMap.get('setup-database'),
      title: { en: 'Database Connection Guide', ja: 'データベース接続ガイド' },
      content: {
        en: `## Connecting to PostgreSQL

### Connection String Format
\`\`\`
postgresql://user:password@localhost:5432/database
\`\`\`

### Common Connection Issues

#### Port already in use
Change the port in docker-compose.yml:
\`\`\`yaml
ports:
  - "5450:5432"  # Use 5450 externally
\`\`\`

#### Container won't start
- Check Docker is running
- Verify no other containers use the same port
- Check disk space availability`,
        ja: `## PostgreSQLへの接続

### 接続文字列の形式
\`\`\`
postgresql://user:password@localhost:5432/database
\`\`\`

### よくある接続問題

#### ポートが既に使用中
docker-compose.ymlでポートを変更:
\`\`\`yaml
ports:
  - "5450:5432"  # 外部では5450を使用
\`\`\`

#### コンテナが起動しない
- Dockerが実行中か確認
- 他のコンテナが同じポートを使っていないか確認
- ディスク容量の空きを確認`,
      },
      contentType: 'guide',
    },
    {
      questId: questMap.get('get-api-key'),
      title: { en: 'API Key Best Practices', ja: 'APIキーのベストプラクティス' },
      content: {
        en: `## Managing Your API Key

### Security Guidelines
1. Never share your API key publicly
2. Don't commit to Git repositories
3. Use environment variables
4. Rotate keys if compromised

### Storage Options
- .env file (local development)
- Environment variables (production)
- Secret management services (enterprise)

### If Your Key is Exposed
1. Immediately revoke it in Google AI Studio
2. Generate a new key
3. Update all environments
4. Audit for unauthorized usage`,
        ja: `## APIキーの管理

### セキュリティガイドライン
1. APIキーを公開しない
2. Gitリポジトリにコミットしない
3. 環境変数を使用する
4. 漏洩した場合はキーをローテーション

### 保存オプション
- .envファイル（ローカル開発）
- 環境変数（本番）
- シークレット管理サービス（エンタープライズ）

### キーが漏洩した場合
1. Google AI Studioですぐに無効化
2. 新しいキーを生成
3. すべての環境を更新
4. 不正使用を監査`,
      },
      contentType: 'guide',
    },
    {
      questId: questMap.get('deploy-vercel'),
      title: { en: 'Vercel Deployment Checklist', ja: 'Vercelデプロイチェックリスト' },
      content: {
        en: `## Pre-Deployment Checklist

### Environment Variables
- [ ] POSTGRES_URL - Database connection
- [ ] AUTH_SECRET - Authentication secret
- [ ] BASE_URL - Your domain URL
- [ ] ENCRYPTION_KEY - For API key encryption

### Database Setup
- [ ] Create production database
- [ ] Run migrations
- [ ] Seed initial data (if needed)

### Post-Deployment
- [ ] Verify all pages load
- [ ] Test authentication flow
- [ ] Check API endpoints
- [ ] Monitor for errors`,
        ja: `## デプロイ前チェックリスト

### 環境変数
- [ ] POSTGRES_URL - データベース接続
- [ ] AUTH_SECRET - 認証シークレット
- [ ] BASE_URL - ドメインURL
- [ ] ENCRYPTION_KEY - APIキー暗号化用

### データベースセットアップ
- [ ] 本番データベースを作成
- [ ] マイグレーションを実行
- [ ] 初期データをシード（必要な場合）

### デプロイ後
- [ ] すべてのページが読み込まれるか確認
- [ ] 認証フローをテスト
- [ ] APIエンドポイントを確認
- [ ] エラーを監視`,
      },
      contentType: 'guide',
    },
  ];

  // ドキュメントを挿入
  for (const doc of bookDocuments) {
    await db.insert(questDocuments).values(doc);
  }
  console.log(`Created ${bookDocuments.length} book documents`);

  for (const doc of chapterDocuments) {
    await db.insert(questDocuments).values(doc);
  }
  console.log(`Created ${chapterDocuments.length} chapter documents`);

  for (const doc of questDocumentsData) {
    if (doc.questId) {
      await db.insert(questDocuments).values(doc);
    }
  }
  console.log(`Created ${questDocumentsData.filter(d => d.questId).length} quest documents`);

  // サマリー
  console.log('\n=== Sample Data Summary ===');
  console.log(`Books: 2`);
  console.log(`Chapters: 4`);
  console.log(`Quests: ${allQuests.length}`);
  console.log(`Documents: ${bookDocuments.length + chapterDocuments.length + questDocumentsData.filter(d => d.questId).length}`);
  console.log('\nNote: Embeddings are not generated. Use /admin/documents to regenerate if needed.');
}

seedSampleData()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\nSeed finished.');
    process.exit(0);
  });
