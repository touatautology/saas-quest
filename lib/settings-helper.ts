/**
 * toolSettings JSONB ヘルパー関数
 *
 * userSettings.toolSettings に保存される設定の読み書きを行う。
 * 暗号化が必要なキーは自動的に暗号化/復号化される。
 */

import { encrypt, decrypt } from './crypto';
import { db } from './db/drizzle';
import { settingDefinitions } from './db/schema';
import { eq } from 'drizzle-orm';

// toolSettingsの型定義
export type ToolSettings = Record<string, string | boolean | number | null>;

// フォールバック用: 暗号化が必要なキー（DBアクセス不可時に使用）
const FALLBACK_ENCRYPTED_KEYS = new Set([
  'geminiApiKey',
  'serverVerificationToken',
]);

// キャッシュ（起動時または初回アクセス時にDBから取得）
let cachedEncryptedKeys: Set<string> | null = null;

/**
 * settingDefinitionsテーブルから暗号化対象キーを取得
 * @returns 暗号化対象キーのSet
 */
export async function getEncryptedKeysFromDB(): Promise<Set<string>> {
  try {
    const encryptedSettings = await db
      .select({ key: settingDefinitions.key })
      .from(settingDefinitions)
      .where(eq(settingDefinitions.isEncrypted, true));

    return new Set(encryptedSettings.map((s) => s.key));
  } catch {
    // DBアクセス失敗時はフォールバック
    return FALLBACK_ENCRYPTED_KEYS;
  }
}

/**
 * 暗号化対象キーを取得（キャッシュ使用）
 */
async function getEncryptedKeys(): Promise<Set<string>> {
  if (!cachedEncryptedKeys) {
    cachedEncryptedKeys = await getEncryptedKeysFromDB();
  }
  return cachedEncryptedKeys;
}

/**
 * キャッシュをクリア（設定定義が更新された場合に呼び出す）
 */
export function clearEncryptedKeysCache(): void {
  cachedEncryptedKeys = null;
}

// 暗号化プレフィックス
const ENCRYPTED_PREFIX = 'encrypted:';

/**
 * 値が暗号化済みかどうかをチェック
 */
function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * toolSettingsから値を取得（復号化対応）
 * @param toolSettings toolSettings JSONB
 * @param key 設定キー
 * @returns 復号化された値（存在しない場合はnull）
 */
export function getToolSetting(
  toolSettings: ToolSettings | null | undefined,
  key: string
): string | boolean | number | null {
  if (!toolSettings || !(key in toolSettings)) {
    return null;
  }

  const value = toolSettings[key];

  // 暗号化されている場合は復号化
  if (isEncrypted(value)) {
    try {
      const encryptedData = (value as string).slice(ENCRYPTED_PREFIX.length);
      return decrypt(encryptedData);
    } catch {
      // 復号化に失敗した場合はnullを返す
      return null;
    }
  }

  return value;
}

/**
 * toolSettingsに値を設定（暗号化対応、同期版）
 * @param toolSettings 既存のtoolSettings（nullの場合は新規作成）
 * @param key 設定キー
 * @param value 設定する値（nullで削除）
 * @param encryptedKeys 暗号化対象キーのSet（省略時はフォールバック使用）
 * @returns 更新されたtoolSettings
 */
export function setToolSetting(
  toolSettings: ToolSettings | null | undefined,
  key: string,
  value: string | boolean | number | null,
  encryptedKeys: Set<string> = FALLBACK_ENCRYPTED_KEYS
): ToolSettings {
  const settings = { ...(toolSettings || {}) };

  if (value === null || value === undefined) {
    delete settings[key];
    return settings;
  }

  // 暗号化が必要なキーの場合
  if (encryptedKeys.has(key) && typeof value === 'string' && value !== '') {
    settings[key] = ENCRYPTED_PREFIX + encrypt(value);
  } else {
    settings[key] = value;
  }

  return settings;
}

/**
 * toolSettingsに値を設定（暗号化対応、非同期版）
 * settingDefinitionsから暗号化対象キーを取得して使用
 * @param toolSettings 既存のtoolSettings（nullの場合は新規作成）
 * @param key 設定キー
 * @param value 設定する値（nullで削除）
 * @returns 更新されたtoolSettings
 */
export async function setToolSettingAsync(
  toolSettings: ToolSettings | null | undefined,
  key: string,
  value: string | boolean | number | null
): Promise<ToolSettings> {
  const encryptedKeys = await getEncryptedKeys();
  return setToolSetting(toolSettings, key, value, encryptedKeys);
}

/**
 * 設定が存在し、有効な値を持っているかチェック
 * @param toolSettings toolSettings JSONB
 * @param key 設定キー
 * @returns 設定が存在し有効ならtrue
 */
export function hasToolSetting(
  toolSettings: ToolSettings | null | undefined,
  key: string
): boolean {
  if (!toolSettings || !(key in toolSettings)) {
    return false;
  }

  const value = toolSettings[key];

  // null, undefined, 空文字, false は未設定とみなす
  if (value === null || value === undefined || value === '' || value === false) {
    return false;
  }

  // 暗号化されている場合は、復号化して確認
  if (isEncrypted(value)) {
    try {
      const decrypted = getToolSetting(toolSettings, key);
      return decrypted !== null && decrypted !== '';
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * 複数の設定を一括で設定（同期版）
 * @param toolSettings 既存のtoolSettings
 * @param updates 更新する設定のオブジェクト
 * @param encryptedKeys 暗号化対象キーのSet（省略時はフォールバック使用）
 * @returns 更新されたtoolSettings
 */
export function setToolSettings(
  toolSettings: ToolSettings | null | undefined,
  updates: Partial<ToolSettings>,
  encryptedKeys: Set<string> = FALLBACK_ENCRYPTED_KEYS
): ToolSettings {
  let settings = { ...(toolSettings || {}) };

  for (const [key, value] of Object.entries(updates)) {
    settings = setToolSetting(settings, key, value ?? null, encryptedKeys);
  }

  return settings;
}

/**
 * 複数の設定を一括で設定（非同期版）
 * settingDefinitionsから暗号化対象キーを取得して使用
 * @param toolSettings 既存のtoolSettings
 * @param updates 更新する設定のオブジェクト
 * @returns 更新されたtoolSettings
 */
export async function setToolSettingsAsync(
  toolSettings: ToolSettings | null | undefined,
  updates: Partial<ToolSettings>
): Promise<ToolSettings> {
  const encryptedKeys = await getEncryptedKeys();
  return setToolSettings(toolSettings, updates, encryptedKeys);
}

/**
 * APIキーをマスク表示用に変換
 * @param toolSettings toolSettings JSONB
 * @param key 設定キー
 * @returns マスクされた値（例: AIza...xyz）
 */
export function getMaskedToolSetting(
  toolSettings: ToolSettings | null | undefined,
  key: string
): string | null {
  const value = getToolSetting(toolSettings, key);

  if (value === null || typeof value !== 'string') {
    return null;
  }

  if (value.length <= 8) {
    return '****';
  }

  return `${value.slice(0, 4)}...${value.slice(-3)}`;
}
