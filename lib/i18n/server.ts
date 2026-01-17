import 'server-only';
import { db } from '@/lib/db/drizzle';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import {
  Locale,
  DEFAULT_LOCALE,
  getTranslation,
  t as translate,
  isValidLocale,
  TranslationKeys,
} from './index';

// Get user's locale preference
export async function getUserLocale(userId?: number): Promise<Locale> {
  // Priority: 1. User setting in DB, 2. Cookie, 3. Default (en)

  // Try to get from user settings in database
  if (userId) {
    try {
      const settings = await db
        .select({ locale: userSettings.locale })
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (settings[0]?.locale && isValidLocale(settings[0].locale)) {
        return settings[0].locale;
      }
    } catch {
      // Database error, fallback to cookie/default
    }
  }

  // Try to get from cookie
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('locale')?.value;
    if (localeCookie && isValidLocale(localeCookie)) {
      return localeCookie;
    }
  } catch {
    // Cookie error, fallback to default
  }

  return DEFAULT_LOCALE;
}

// Get translations for server components
export async function getServerTranslations(userId?: number): Promise<{
  locale: Locale;
  translations: TranslationKeys;
  t: (key: string, params?: Record<string, string | number>) => string;
}> {
  const locale = await getUserLocale(userId);
  const translations = getTranslation(locale);

  return {
    locale,
    translations,
    t: (key: string, params?: Record<string, string | number>) =>
      translate(translations, key, params),
  };
}
