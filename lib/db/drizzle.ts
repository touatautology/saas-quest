import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// 開発環境でのホットリロード時に接続が増え続けるのを防ぐ
// グローバル変数に接続インスタンスをキャッシュ
const globalForDb = globalThis as unknown as {
  client: Sql | undefined;
};

export const client = globalForDb.client ?? postgres(process.env.POSTGRES_URL, {
  max: 10, // 最大接続数を制限
  idle_timeout: 20, // アイドル接続のタイムアウト（秒）
  connect_timeout: 10, // 接続タイムアウト（秒）
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
