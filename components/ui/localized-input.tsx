'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Languages, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// サポートする言語
const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'ja', label: 'Japanese', flag: 'JA' },
] as const;

type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export type LocalizedValue = {
  en: string;
  ja?: string;
};

interface LocalizedInputProps {
  label: string;
  value: LocalizedValue;
  onChange: (value: LocalizedValue) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  primaryLang?: LanguageCode;
}

export function LocalizedInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline = false,
  rows = 3,
  className,
  primaryLang = 'en',
}: LocalizedInputProps) {
  const [activeTab, setActiveTab] = useState<LanguageCode>(primaryLang);
  const [isTranslating, setIsTranslating] = useState(false);

  // 翻訳実行
  const handleTranslate = async (sourceLang: LanguageCode, targetLang: LanguageCode) => {
    const sourceText = value[sourceLang];
    if (!sourceText) {
      alert(`Please enter ${sourceLang === 'en' ? 'English' : 'Japanese'} text first`);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          targetLang,
          sourceLang,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onChange({
          ...value,
          [targetLang]: data.translated,
        });
        setActiveTab(targetLang);
      } else {
        alert(data.error || 'Translation failed');
      }
    } catch {
      alert('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleValueChange = (lang: LanguageCode, text: string) => {
    onChange({
      ...value,
      [lang]: text,
    });
  };

  const inputProps = {
    placeholder,
    required: required && activeTab === 'en',
    disabled: isTranslating,
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1">
          {isTranslating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LanguageCode)}>
        <div className="flex items-center gap-2 mb-2">
          <TabsList className="h-8">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TabsTrigger
                key={lang.code}
                value={lang.code}
                className="text-xs px-2 h-6"
              >
                {lang.flag}
                {value[lang.code] && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 翻訳ボタン */}
          <div className="flex items-center gap-1 ml-auto">
            {activeTab === 'en' && value.en && !value.ja && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleTranslate('en', 'ja')}
                disabled={isTranslating}
              >
                <Sparkles className="h-3 w-3" />
                EN → JA
              </Button>
            )}
            {activeTab === 'ja' && value.ja && !value.en && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleTranslate('ja', 'en')}
                disabled={isTranslating}
              >
                <Sparkles className="h-3 w-3" />
                JA → EN
              </Button>
            )}
            {value.en && value.ja && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => {
                  const source = activeTab;
                  const target = activeTab === 'en' ? 'ja' : 'en';
                  handleTranslate(source, target);
                }}
                disabled={isTranslating}
                title="Re-translate"
              >
                <Languages className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {SUPPORTED_LANGUAGES.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="mt-0">
            {multiline ? (
              <textarea
                value={value[lang.code] || ''}
                onChange={(e) => handleValueChange(lang.code, e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                rows={rows}
                {...inputProps}
              />
            ) : (
              <Input
                value={value[lang.code] || ''}
                onChange={(e) => handleValueChange(lang.code, e.target.value)}
                {...inputProps}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
