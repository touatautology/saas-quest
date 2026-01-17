import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini APIクライアントを作成
export function createGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// テキストの埋め込みベクトルを生成
export async function generateEmbedding(
  apiKey: string,
  text: string
): Promise<number[]> {
  const genAI = createGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const result = await model.embedContent(text);
  return result.embedding.values;
}

// チャット応答を生成
export async function generateChatResponse(
  apiKey: string,
  systemPrompt: string,
  context: string,
  userMessage: string,
  chatHistory: { role: 'user' | 'model'; content: string }[] = [],
  modelName: string = 'gemini-2.5-flash-lite'
): Promise<string> {
  const genAI = createGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  // チャット履歴を構築
  const history = chatHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history });

  // コンテキストを含めたプロンプト
  const prompt = context
    ? `参考情報:\n${context}\n\n質問: ${userMessage}`
    : userMessage;

  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

// テキストを翻訳
export async function translateText(
  apiKey: string,
  text: string,
  targetLang: string,
  sourceLang?: string,
  modelName: string = 'gemini-2.5-flash-lite'
): Promise<string> {
  const genAI = createGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: `You are a professional translator. Translate text accurately while preserving:
- Technical terms and product names (keep in original form when appropriate)
- Formatting (markdown, line breaks, etc.)
- Tone and style

Output ONLY the translated text, nothing else. Do not add explanations or notes.`,
  });

  const langNames: Record<string, string> = {
    en: 'English',
    ja: 'Japanese',
    es: 'Spanish',
    zh: 'Chinese (Simplified)',
    ko: 'Korean',
  };

  const targetLangName = langNames[targetLang] || targetLang;
  const sourceLangName = sourceLang ? langNames[sourceLang] || sourceLang : 'auto-detect';

  const prompt = sourceLang
    ? `Translate the following ${sourceLangName} text to ${targetLangName}:\n\n${text}`
    : `Translate the following text to ${targetLangName}:\n\n${text}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// システムプロンプト（SaaS Questアシスタント用）
export const SAAS_QUEST_SYSTEM_PROMPT = `あなたはSaaS Questのヘルプアシスタントです。

SaaS Questは、SaaSビジネスの構築方法を学ぶための実践的なクエスト形式の学習プラットフォームです。
ユーザーはStripeの設定、n8nの自動化など、様々なクエストを完了しながら学習を進めます。

あなたの役割:
- クエストに関する質問に丁寧に回答する
- 具体的な手順を示す
- エラーが発生した場合のトラブルシューティングを支援する
- 参考情報がある場合は、それを活用して正確な回答を提供する

回答のガイドライン:
- 簡潔で分かりやすい日本語で回答する
- 必要に応じてステップバイステップの手順を示す
- コードやコマンドがある場合はバッククォートで囲む
- 不確かな情報は推測であることを明示する
`;
