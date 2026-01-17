import { en, TranslationKeys } from './locales/en';
import { es } from './locales/es';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
import { ko } from './locales/ko';

// Supported locales
export const LOCALES = ['en', 'es', 'ja', 'zh', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];

// Language metadata for UI
export const LANGUAGES = [
  { code: 'en' as Locale, name: 'English', nativeName: 'English' },
  { code: 'es' as Locale, name: 'Spanish', nativeName: 'Español' },
  { code: 'ja' as Locale, name: 'Japanese', nativeName: '日本語' },
  { code: 'zh' as Locale, name: 'Chinese', nativeName: '简体中文' },
  { code: 'ko' as Locale, name: 'Korean', nativeName: '한국어' },
] as const;

// Default locale
export const DEFAULT_LOCALE: Locale = 'en';

// All translations
export const translations: Record<Locale, TranslationKeys> = {
  en,
  es,
  ja,
  zh,
  ko,
};

// Get translation object for a locale
export function getTranslation(locale: Locale): TranslationKeys {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

// Type-safe translation function
export function t(
  translationObj: TranslationKeys,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let value: unknown = translationObj;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Key not found, return the key itself
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Simple interpolation: {name} -> value
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, k) =>
      String(params[k] ?? `{${k}}`)
    );
  }

  return value;
}

// Localized text type for JSONB columns
export type LocalizedText = {
  en: string;
  es?: string;
  ja?: string;
  zh?: string;
  ko?: string;
  [key: string]: string | undefined;
};

// Get localized text from JSONB with fallback to English
export function getLocalizedText(
  text: LocalizedText | string | null | undefined,
  locale: Locale
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[locale] || text.en || '';
}

// Check if a locale is valid
export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

// Re-export types
export type { TranslationKeys };
