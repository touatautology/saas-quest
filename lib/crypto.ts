import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHmac, timingSafeEqual } from 'crypto';

// 環境変数から暗号化キーを取得（32バイト必要）
// ENCRYPTION_KEYは32文字以上の文字列を設定
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // scryptでキーを派生（32バイト = 256ビット）
  return scryptSync(key, 'saas-quest-salt', 32);
};

/**
 * AES-256-GCMで文字列を暗号化
 * @param text 暗号化する平文
 * @returns 暗号化された文字列（iv:authTag:ciphertext形式）
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16); // 初期化ベクトル
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // iv:authTag:ciphertext の形式で返す
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCMで暗号文を復号化
 * @param encryptedText 暗号化された文字列（iv:authTag:ciphertext形式）
 * @returns 復号化された平文
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = encryptedText.split(':');

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * APIキーをマスク表示用に変換
 * @param apiKey 完全なAPIキー
 * @returns マスクされたAPIキー（例: AIza...xyz）
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '****';
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-3)}`;
}

// ========== HMAC署名関連（サーバー検証用） ==========

/**
 * サーバー検証用トークンを生成
 * @returns 64文字のランダムなトークン（hex）
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * HMAC-SHA256署名を生成
 * @param payload 署名対象のペイロード文字列
 * @param secret 共有シークレット
 * @returns HMAC署名（hex）
 */
export function generateHmacSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * HMAC-SHA256署名を検証（タイミング攻撃対策付き）
 * @param payload 署名対象のペイロード文字列
 * @param signature 検証する署名（hex）
 * @param secret 共有シークレット
 * @returns 署名が有効ならtrue
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expected = generateHmacSignature(payload, secret);

  // 長さが異なる場合はタイミング攻撃を防ぐため早期リターンしない
  // 代わりにダミー比較を行う
  if (signature.length !== expected.length) {
    // 長さが違う場合でも一定時間の比較を行う
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * サーバー検証リクエスト用の署名ペイロードを構築
 * @param timestamp Unix秒タイムスタンプ
 * @param nonce ランダムnonce
 * @param body リクエストボディ（オブジェクト）
 * @returns 署名対象のペイロード文字列
 */
export function buildSignaturePayload(timestamp: number, nonce: string, body: object): string {
  return `${timestamp}.${nonce}.${JSON.stringify(body)}`;
}

/**
 * サーバー検証レスポンス用の署名ペイロードを構築
 * @param timestamp Unix秒タイムスタンプ
 * @param data レスポンスデータ（オブジェクト）
 * @returns 署名対象のペイロード文字列
 */
export function buildResponseSignaturePayload(timestamp: number, data: object): string {
  return `${timestamp}.${JSON.stringify(data)}`;
}

/**
 * ランダムnonceを生成
 * @returns 32文字のランダムなnonce（hex）
 */
export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}
