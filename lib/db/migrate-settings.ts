/**
 * レガシーカラムからtoolSettingsへの移行スクリプト
 *
 * 既存のユーザー設定をレガシーカラムからtoolSettings JSONBに移行する。
 * このスクリプトは一度だけ実行し、移行完了後はPhase 4でフォールバックコードを削除する。
 *
 * 使用方法:
 *   npx tsx lib/db/migrate-settings.ts
 */

import { db } from './drizzle';
import { userSettings } from './schema';
import { decrypt, encrypt } from '../crypto';
import { eq } from 'drizzle-orm';

const ENCRYPTED_PREFIX = 'encrypted:';

type ToolSettings = Record<string, string | boolean | number | null>;

async function migrateSettingsToToolSettings() {
  console.log('=== レガシー設定 → toolSettings 移行開始 ===\n');

  // 全ユーザー設定を取得
  const allSettings = await db.select().from(userSettings);

  console.log(`対象ユーザー数: ${allSettings.length}\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const setting of allSettings) {
    try {
      // 既存のtoolSettingsを取得（なければ空オブジェクト）
      const currentToolSettings: ToolSettings = (setting.toolSettings as ToolSettings) || {};

      // 移行が必要かどうかチェック
      const needsMigration =
        (setting.geminiApiKeyEncrypted && !currentToolSettings.geminiApiKey) ||
        (setting.geminiModel && !currentToolSettings.geminiModel) ||
        (setting.aiChatEnabled !== null && currentToolSettings.aiChatEnabled === undefined) ||
        (setting.serverUrl && !currentToolSettings.serverUrl) ||
        (setting.serverVerificationToken && !currentToolSettings.serverVerificationToken) ||
        (setting.serverTokenCreatedAt && !currentToolSettings.serverTokenCreatedAt);

      if (!needsMigration) {
        skippedCount++;
        continue;
      }

      // レガシーカラムの値をtoolSettingsにコピー
      const newToolSettings: ToolSettings = { ...currentToolSettings };

      // geminiApiKey（復号化して再暗号化）
      if (setting.geminiApiKeyEncrypted && !newToolSettings.geminiApiKey) {
        const decrypted = decrypt(setting.geminiApiKeyEncrypted);
        newToolSettings.geminiApiKey = ENCRYPTED_PREFIX + encrypt(decrypted);
      }

      // geminiModel
      if (setting.geminiModel && !newToolSettings.geminiModel) {
        newToolSettings.geminiModel = setting.geminiModel;
      }

      // aiChatEnabled
      if (setting.aiChatEnabled !== null && newToolSettings.aiChatEnabled === undefined) {
        newToolSettings.aiChatEnabled = setting.aiChatEnabled;
      }

      // serverUrl
      if (setting.serverUrl && !newToolSettings.serverUrl) {
        newToolSettings.serverUrl = setting.serverUrl;
      }

      // serverVerificationToken（復号化して再暗号化）
      if (setting.serverVerificationToken && !newToolSettings.serverVerificationToken) {
        const decrypted = decrypt(setting.serverVerificationToken);
        newToolSettings.serverVerificationToken = ENCRYPTED_PREFIX + encrypt(decrypted);
      }

      // serverTokenCreatedAt
      if (setting.serverTokenCreatedAt && !newToolSettings.serverTokenCreatedAt) {
        newToolSettings.serverTokenCreatedAt = setting.serverTokenCreatedAt.toISOString();
      }

      // 更新
      await db
        .update(userSettings)
        .set({
          toolSettings: newToolSettings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.id, setting.id));

      migratedCount++;
      console.log(`[OK] User ID: ${setting.userId} - 移行完了`);
    } catch (error) {
      errorCount++;
      console.error(`[ERROR] User ID: ${setting.userId} - 移行失敗:`, error);
    }
  }

  console.log('\n=== 移行結果 ===');
  console.log(`移行成功: ${migratedCount}`);
  console.log(`スキップ（既に移行済み）: ${skippedCount}`);
  console.log(`エラー: ${errorCount}`);
  console.log('================\n');

  if (errorCount === 0) {
    console.log('移行が正常に完了しました。');
    console.log('次のステップ: Phase 4でフォールバックコードを削除してください。');
  } else {
    console.log('一部のユーザーで移行エラーが発生しました。');
    console.log('エラーを確認し、必要に応じて再実行してください。');
  }
}

// スクリプトとして実行された場合
migrateSettingsToToolSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('移行スクリプトでエラーが発生しました:', error);
    process.exit(1);
  });
