/**
 * 設定定義のシードデータ
 *
 * 既存の設定をsettingDefinitionsテーブルに登録する。
 *
 * 使用方法:
 *   npx tsx lib/db/seed-settings.ts
 */

import { db } from './drizzle';
import { settingDefinitions } from './schema';

const settingsData = [
  {
    key: 'geminiApiKey',
    name: { en: 'Gemini API Key', ja: 'Gemini APIキー' },
    description: { en: 'API key for Google Gemini AI', ja: 'Google Gemini AI用のAPIキー' },
    category: 'ai',
    valueType: 'apiKey',
    isEncrypted: true,
    order: 1,
  },
  {
    key: 'geminiModel',
    name: { en: 'Gemini Model', ja: 'Geminiモデル' },
    description: { en: 'AI model to use for chat', ja: 'チャットに使用するAIモデル' },
    category: 'ai',
    valueType: 'string',
    isEncrypted: false,
    order: 2,
  },
  {
    key: 'aiChatEnabled',
    name: { en: 'AI Chat Enabled', ja: 'AIチャット有効' },
    description: { en: 'Enable AI chat assistance', ja: 'AIチャットアシスタンスを有効にする' },
    category: 'ai',
    valueType: 'boolean',
    isEncrypted: false,
    order: 3,
  },
  {
    key: 'serverUrl',
    name: { en: 'Server URL', ja: 'サーバーURL' },
    description: { en: 'URL of the user\'s server', ja: 'ユーザーのサーバーURL' },
    category: 'server',
    valueType: 'url',
    isEncrypted: false,
    order: 4,
  },
  {
    key: 'serverVerificationToken',
    name: { en: 'Verification Token', ja: '検証トークン' },
    description: { en: 'Token for server verification', ja: 'サーバー検証用トークン' },
    category: 'server',
    valueType: 'apiKey',
    isEncrypted: true,
    order: 5,
  },
];

async function seedSettings() {
  console.log('=== 設定定義シード開始 ===\n');

  for (const setting of settingsData) {
    try {
      await db
        .insert(settingDefinitions)
        .values(setting)
        .onConflictDoNothing({ target: settingDefinitions.key });
      console.log(`[OK] ${setting.key}`);
    } catch (error) {
      console.error(`[ERROR] ${setting.key}:`, error);
    }
  }

  console.log('\n=== シード完了 ===');
}

seedSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('シードエラー:', error);
    process.exit(1);
  });
