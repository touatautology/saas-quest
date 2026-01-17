import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { LocaleProvider } from '@/lib/i18n/context';
import { getUserLocale } from '@/lib/i18n/server';
import { Locale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'SaaS Quest',
  description: 'Learn to build SaaS applications through interactive quests.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

async function getLocale(): Promise<Locale> {
  const user = await getUser();
  return getUserLocale(user?.id);
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <LocaleProvider locale={locale}>
          <SWRConfig
            value={{
              fallback: {
                // We do NOT await here
                // Only components that read this data will suspend
                '/api/user': getUser(),
                '/api/team': getTeamForUser()
              }
            }}
          >
            {children}
          </SWRConfig>
        </LocaleProvider>
      </body>
    </html>
  );
}
