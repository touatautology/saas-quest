'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useLocale } from '@/lib/i18n/context';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

type Book = {
  id: number;
  slug: string;
  title: LocalizedText;
};

type Chapter = {
  id: number;
  slug: string;
  title: LocalizedText;
  bookId: number | null;
};

type Quest = {
  id: number;
  slug: string;
  title: LocalizedText;
  description: LocalizedText | null;
  chapterId: number | null;
  order: number;
  category: string;
  prerequisiteQuestId: number | null;
  verificationType: string;
};

type QuestProgress = {
  questId: number;
  status: 'locked' | 'available' | 'completed';
  completedAt: string | null;
};

type QuestsData = {
  books: Book[];
  chapters: Chapter[];
  quests: Quest[];
  progress: QuestProgress[];
};

type DocumentItem = {
  id: number;
  title: LocalizedText;
  contentType: string;
};

type DocsData = {
  documents: DocumentItem[];
};

// コンテンツタイプのラベル
const CONTENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  faq: { label: 'FAQ', color: 'bg-blue-100 text-blue-700' },
  guide: { label: 'Guide', color: 'bg-green-100 text-green-700' },
  troubleshoot: { label: 'Troubleshoot', color: 'bg-amber-100 text-amber-700' },
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StripeApiKeyForm({ quest, onSuccess }: { quest: Quest; onSuccess: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/quests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questSlug: quest.slug,
          verificationType: quest.verificationType,
          data: { apiKey },
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        mutate('/api/quests');
        onSuccess();
      }
    } catch (error) {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="apiKey">Stripe Secret Key</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="sk_test_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="mt-1"
        />
        <p className="text-sm text-muted-foreground mt-1">
          テスト用のシークレットキー（sk_test_で始まる）を入力してください
        </p>
      </div>

      {result && (
        <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !apiKey}
        className="bg-orange-500 hover:bg-orange-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            検証中...
          </>
        ) : (
          '検証する'
        )}
      </Button>
    </form>
  );
}

function ManualConfirmForm({ quest, onSuccess }: { quest: Quest; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/quests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questSlug: quest.slug,
          verificationType: quest.verificationType,
          data: { confirmed: true },
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        mutate('/api/quests');
        onSuccess();
      }
    } catch (error) {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        このクエストは手動で完了を確認します。完了したら下のボタンをクリックしてください。
      </p>

      {result && (
        <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.message}
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={isLoading}
        className="bg-orange-500 hover:bg-orange-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            確認中...
          </>
        ) : (
          '完了としてマーク'
        )}
      </Button>
    </div>
  );
}

function WebhookForm({ quest, onSuccess }: { quest: Quest; onSuccess: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/quests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questSlug: quest.slug,
          verificationType: quest.verificationType,
          data: { webhookUrl },
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        mutate('/api/quests');
        onSuccess();
      }
    } catch (error) {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="webhookUrl">n8n Webhook URL</Label>
        <Input
          id="webhookUrl"
          type="url"
          placeholder="https://your-n8n.app.n8n.cloud/webhook/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="mt-1"
        />
        <p className="text-sm text-muted-foreground mt-1">
          n8nのWebhookノードからコピーしたURLを入力してください。テストリクエストを送信して検証します。
        </p>
      </div>

      {result && (
        <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !webhookUrl}
        className="bg-orange-500 hover:bg-orange-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            検証中...
          </>
        ) : (
          'Webhookをテスト'
        )}
      </Button>
    </form>
  );
}

function ServerStatusForm({ quest, onSuccess }: { quest: Quest; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: Record<string, unknown> } | null>(null);

  const handleVerify = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/quests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questSlug: quest.slug,
          verificationType: quest.verificationType,
          data: {},  // クエストの verificationConfig を使用
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        mutate('/api/quests');
        onSuccess();
      }
    } catch (error) {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>事前準備:</strong> このクエストを完了するには、まず
          <Link href="/dashboard/server-config" className="text-orange-500 hover:underline mx-1">
            サーバー設定ページ
          </Link>
          でサーバーURLと検証トークンを設定してください。
        </p>
      </div>

      {result && (
        <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p>{result.message}</p>
          {result.data && (
            <div className="mt-2 text-xs">
              <pre className="bg-white/50 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleVerify}
        disabled={isLoading}
        className="bg-orange-500 hover:bg-orange-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            サーバーを検証中...
          </>
        ) : (
          'サーバー設定を検証'
        )}
      </Button>
    </div>
  );
}

function RelatedDocuments({ questId, locale }: { questId: number; locale: string }) {
  const { data, isLoading } = useSWR<DocsData>(`/api/docs?questId=${questId}`, fetcher);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        ドキュメントを読み込み中...
      </div>
    );
  }

  if (!data?.documents || data.documents.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-orange-500" />
        関連ドキュメント
      </h3>
      <div className="space-y-2">
        {data.documents.map((doc) => {
          const title = getLocalizedText(doc.title, locale as 'en' | 'ja' | 'es' | 'zh' | 'ko');
          const contentTypeInfo = CONTENT_TYPE_LABELS[doc.contentType] || {
            label: doc.contentType,
            color: 'bg-gray-100 text-gray-700',
          };
          return (
            <Link
              key={doc.id}
              href={`/dashboard/docs/${doc.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors border bg-white/50"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{title}</span>
              </div>
              <Badge className={`${contentTypeInfo.color} text-xs`}>
                {contentTypeInfo.label}
              </Badge>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t">
        <Link
          href="/dashboard/docs"
          className="text-sm text-orange-500 hover:text-orange-600 hover:underline"
        >
          すべてのドキュメントを見る →
        </Link>
      </div>
    </div>
  );
}

function QuestInstructions({ quest }: { quest: Quest }) {
  switch (quest.slug) {
    case 'stripe-account':
      return (
        <div className="space-y-4">
          <h3 className="font-medium">手順:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline inline-flex items-center">
                Stripeアカウントを作成 <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </li>
            <li>ダッシュボードにログイン</li>
            <li>
              <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline inline-flex items-center">
                APIキーページ <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              を開く
            </li>
            <li>「Secret key」をコピー（sk_test_で始まるもの）</li>
            <li>下のフォームに貼り付けて検証</li>
          </ol>
        </div>
      );

    case 'stripe-product':
      return (
        <div className="space-y-4">
          <h3 className="font-medium">手順:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <a href="https://dashboard.stripe.com/test/products/create" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline inline-flex items-center">
                Stripe商品作成ページ <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              を開く
            </li>
            <li>商品名を入力（例: 「テスト商品」）</li>
            <li>価格を設定（例: 100円）</li>
            <li>「商品を保存」をクリック</li>
            <li>下のフォームでAPIキーを入力して検証</li>
          </ol>
        </div>
      );

    case 'n8n-setup':
      return (
        <div className="space-y-4">
          <h3 className="font-medium">手順:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <a href="https://n8n.io/cloud" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline inline-flex items-center">
                n8n Cloudに登録 <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </li>
            <li>新しいワークフローを作成</li>
            <li>「Webhook」ノードを追加（トリガーとして）</li>
            <li>HTTP Methodを「POST」に設定</li>
            <li>「Respond」ノードを追加して接続（成功レスポンスを返すため）</li>
            <li>ワークフローを「Active」に切り替え</li>
            <li>WebhookノードのURLをコピー（Production URLを使用）</li>
            <li>下のフォームにURLを貼り付けてテスト</li>
          </ol>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-800">
              <strong>ヒント:</strong> WebhookノードのURLは「Test URL」と「Production URL」があります。
              検証には「Production URL」を使い、ワークフローを「Active」にしてください。
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function QuestDetailPage() {
  const params = useParams();
  const { locale, t } = useLocale();
  const slug = params.slug as string;
  const [completed, setCompleted] = useState(false);

  const { data, isLoading } = useSWR<QuestsData>('/api/quests', fetcher);

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  const quest = data?.quests.find((q) => q.slug === slug);
  const progress = data?.progress.find((p) => p.questId === quest?.id);

  if (!quest) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">{t('quests.noQuests')}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // クエストのチャプターとブックを取得して戻り先URLを構築
  const chapter = quest.chapterId ? data?.chapters.find(c => c.id === quest.chapterId) : null;
  const book = chapter?.bookId ? data?.books.find(b => b.id === chapter.bookId) : null;

  // 戻り先URL（ブック/チャプターのコンテキストを維持 + アンカーでスクロール位置指定）
  const backUrl = book && chapter
    ? `/dashboard/quests?book=${book.slug}&chapter=${chapter.slug}#chapter-${chapter.slug}`
    : book
    ? `/dashboard/quests?book=${book.slug}`
    : '/dashboard/quests';

  const title = getLocalizedText(quest.title, locale);
  const description = getLocalizedText(quest.description, locale);
  const isCompleted = progress?.status === 'completed' || completed;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <Link href={backUrl} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('common.back')}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCompleted && <CheckCircle2 className="h-6 w-6 text-green-500" />}
              <CardTitle className="text-xl">{title}</CardTitle>
            </div>
            <Badge variant={isCompleted ? 'default' : 'outline'}>{quest.category}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isCompleted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t('quests.questCompleted')}</span>
              </div>
            </div>
          ) : (
            <>
              <QuestInstructions quest={quest} />

              <hr />

              <div>
                <h3 className="font-medium mb-4">{t('quests.verifying') || 'Verification'}:</h3>
                {quest.verificationType === 'api_key' || quest.verificationType === 'stripe_product' ? (
                  <StripeApiKeyForm quest={quest} onSuccess={() => setCompleted(true)} />
                ) : quest.verificationType === 'webhook' ? (
                  <WebhookForm quest={quest} onSuccess={() => setCompleted(true)} />
                ) : quest.verificationType === 'manual' ? (
                  <ManualConfirmForm quest={quest} onSuccess={() => setCompleted(true)} />
                ) : quest.verificationType === 'server_status' ? (
                  <ServerStatusForm quest={quest} onSuccess={() => setCompleted(true)} />
                ) : null}
              </div>
            </>
          )}

          {/* 関連ドキュメント - 完了状態でも表示 */}
          <RelatedDocuments questId={quest.id} locale={locale} />
        </CardContent>
      </Card>

      <ChatPanel questId={quest.id} questTitle={title} />
    </section>
  );
}
