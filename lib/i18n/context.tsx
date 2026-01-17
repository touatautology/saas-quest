'use client';

import { createContext, useContext, ReactNode } from 'react';
import {
  Locale,
  TranslationKeys,
  getTranslation,
  t as translate,
  DEFAULT_LOCALE,
} from './index';

type LocaleContextType = {
  locale: Locale;
  translations: TranslationKeys;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const translations = getTranslation(locale);

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(translations, key, params);

  return (
    <LocaleContext.Provider value={{ locale, translations, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    // Fallback for components rendered outside provider
    const translations = getTranslation(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      translations,
      t: (key: string, params?: Record<string, string | number>) =>
        translate(translations, key, params),
    };
  }
  return context;
}
