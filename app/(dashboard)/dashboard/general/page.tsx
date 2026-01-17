'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Bot, Key, ExternalLink, Cpu, Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';
import { Suspense } from 'react';
import { LANGUAGES, Locale } from '@/lib/i18n';
import { useLocale } from '@/lib/i18n/context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = ''
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

type UserSettingsData = {
  aiChatEnabled: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  geminiModel: string;
  locale: Locale;
};

// 利用可能なモデル一覧
const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: '無料枠で利用可能。高速で軽量（推奨）' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: '無料枠で利用可能。高精度' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', description: '最新モデル' },
];

function LanguageSettings() {
  const { t, locale: currentLocale } = useLocale();
  const { data: settings, isLoading } = useSWR<UserSettingsData>(
    '/api/user/settings',
    fetcher
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = async (newLocale: string) => {
    setIsSaving(true);
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
      // 言語変更後はページをリロードしてLocaleProviderを更新
      window.location.reload();
    } catch {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedLocale = settings?.locale || currentLocale;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="language-select">{t('settings.language')}</Label>
        <Select
          value={selectedLocale}
          onValueChange={handleLanguageChange}
          disabled={isSaving}
        >
          <SelectTrigger id="language-select" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="flex items-center gap-2">
                  <span>{lang.nativeName}</span>
                  <span className="text-muted-foreground text-xs">({lang.name})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {t('settings.languageDescription')}
        </p>
      </div>
      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.saving')}
        </div>
      )}
    </div>
  );
}

function AIChatSettings() {
  const { data: settings, isLoading } = useSWR<UserSettingsData>(
    '/api/user/settings',
    fetcher
  );
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: apiKey,
          aiChatEnabled: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        setApiKey('');
        mutate('/api/user/settings');
      } else {
        setResult({ success: false, message: data.message || 'エラーが発生しました' });
      }
    } catch {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiChatEnabled: enabled }),
      });
      mutate('/api/user/settings');
    } catch {
      // エラーは無視
    }
  };

  const handleRemoveApiKey = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: null,
          aiChatEnabled: false,
        }),
      });
      setResult({ success: true, message: 'APIキーを削除しました' });
      mutate('/api/user/settings');
    } catch {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModelChange = async (model: string) => {
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiModel: model }),
      });
      mutate('/api/user/settings');
      setResult({ success: true, message: 'モデルを変更しました' });
    } catch {
      setResult({ success: false, message: 'エラーが発生しました' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {settings?.hasApiKey ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-green-500" />
              <span className="text-sm">APIキー設定済み: {settings.maskedApiKey}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="ai-enabled" className="text-sm">
                  有効
                </Label>
                <Switch
                  id="ai-enabled"
                  checked={settings.aiChatEnabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveApiKey}
                disabled={isSaving}
              >
                削除
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="gemini-model" className="text-sm font-medium">
                使用モデル
              </Label>
            </div>
            <Select
              value={settings.geminiModel}
              onValueChange={handleModelChange}
            >
              <SelectTrigger id="gemini-model" className="w-full">
                <SelectValue placeholder="モデルを選択" />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span>{model.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            クエストのAIヘルプチャットを利用するには、Google Gemini APIキーを登録してください。
          </p>
          <div className="space-y-2">
            <Label htmlFor="gemini-api-key">Gemini APIキー</Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:underline inline-flex items-center gap-1"
              >
                Google AI StudioでAPIキーを取得 <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <Button
            onClick={handleSaveApiKey}
            disabled={isSaving || !apiKey}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                検証中...
              </>
            ) : (
              'APIキーを保存'
            )}
          </Button>
        </div>
      )}

      {result && (
        <div
          className={`p-3 rounded-md text-sm ${
            result.success
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

export default function GeneralPage() {
  const { t } = useLocale();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        {t('settings.general')}
      </h1>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-orange-500" />
            <CardTitle>{t('settings.language')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.languageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.accountInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.saveChanges')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-orange-500" />
            <CardTitle>{t('settings.aiChat')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.aiChatDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIChatSettings />
        </CardContent>
      </Card>
    </section>
  );
}
