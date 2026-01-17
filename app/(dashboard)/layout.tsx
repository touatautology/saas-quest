'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut, Library, Trophy, ChevronDown, Wrench, Lock, ExternalLink, CreditCard, Workflow, Server, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';
import { useLocale } from '@/lib/i18n/context';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

type Book = {
  id: number;
  slug: string;
  title: LocalizedText;
};

type ToolWithStatus = {
  id: number;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  icon: string | null;
  externalUrl: string | null;
  internalPath: string | null;
  unlocked: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// アイコン名からコンポーネントを取得
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Workflow,
  Server,
  Wrench,
  Sparkles,
};

function getIcon(iconName: string | null) {
  if (!iconName) return Wrench;
  return iconMap[iconName] || Wrench;
}

function BookshelfMenu() {
  const { locale, t } = useLocale();
  const { data } = useSWR<{ books: Book[] }>('/api/quests', fetcher);
  const [isOpen, setIsOpen] = useState(false);

  const books = data?.books || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-1 text-gray-700 hover:text-gray-900">
          <Library className="h-4 w-4" />
          <span className="hidden sm:inline">{t('nav.bookshelf')}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {books.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">{t('nav.noBooks')}</span>
          </DropdownMenuItem>
        ) : (
          books.map((book) => (
            <DropdownMenuItem key={book.id} asChild>
              <Link
                href={`/dashboard/quests?book=${book.slug}`}
                className="flex items-center gap-2 w-full"
                onClick={() => setIsOpen(false)}
              >
                <Library className="h-4 w-4 text-purple-600" />
                <span>{getLocalizedText(book.title, locale)}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolsMenu() {
  const { locale, t } = useLocale();
  const { data } = useSWR<{ tools: ToolWithStatus[] }>('/api/tools', fetcher);
  const [isOpen, setIsOpen] = useState(false);

  const tools = data?.tools || [];
  const unlockedCount = tools.filter(t => t.unlocked).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-1 text-gray-700 hover:text-gray-900">
          <Wrench className="h-4 w-4 text-blue-500" />
          <span className="hidden sm:inline">{t('nav.tools')}</span>
          {tools.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {unlockedCount}/{tools.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {tools.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">{t('nav.noTools')}</span>
          </DropdownMenuItem>
        ) : (
          tools.map((tool) => {
            const IconComponent = getIcon(tool.icon);
            const name = getLocalizedText(tool.name, locale);
            const description = tool.description ? getLocalizedText(tool.description, locale) : null;

            if (tool.unlocked) {
              // アンロック済み - クリック可能
              const href = tool.externalUrl || tool.internalPath || '#';
              const isExternal = !!tool.externalUrl;

              return (
                <DropdownMenuItem key={tool.id} asChild>
                  {isExternal ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <IconComponent className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{name}</div>
                        {description && (
                          <div className="text-xs text-muted-foreground truncate">{description}</div>
                        )}
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="flex items-center gap-3 w-full"
                      onClick={() => setIsOpen(false)}
                    >
                      <IconComponent className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{name}</div>
                        {description && (
                          <div className="text-xs text-muted-foreground truncate">{description}</div>
                        )}
                      </div>
                    </Link>
                  )}
                </DropdownMenuItem>
              );
            } else {
              // 未アンロック - グレーアウト
              return (
                <DropdownMenuItem key={tool.id} disabled className="opacity-50">
                  <div className="flex items-center gap-3 w-full">
                    <IconComponent className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-500">{name}</div>
                      {description && (
                        <div className="text-xs text-gray-400 truncate">{description}</div>
                      )}
                    </div>
                    <Lock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  </div>
                </DropdownMenuItem>
              );
            }
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const { t } = useLocale();
  const { data: user } = useSWR<User>('/api/user', fetcher);

  return (
    <header className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <CircleIcon className="h-6 w-6 text-orange-500" />
            <span className="ml-2 text-xl font-semibold text-gray-900">ACME</span>
          </Link>
          {user && (
            <nav className="flex items-center gap-2">
              <BookshelfMenu />
              <ToolsMenu />
              <Link href="/dashboard/rewards">
                <Button variant="ghost" className="flex items-center gap-1 text-gray-700 hover:text-gray-900">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="hidden sm:inline">{t('nav.rewards')}</span>
                </Button>
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <Header />
      {children}
    </section>
  );
}
