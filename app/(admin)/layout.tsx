'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/context';
import {
  LayoutDashboard,
  Users,
  Swords,
  FileText,
  BarChart3,
  Menu,
  ArrowLeft,
  Trophy,
  Settings,
  Wrench,
  Cog,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLocale();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, labelKey: 'dashboard' },
    { href: '/admin/users', icon: Users, labelKey: 'users' },
    { href: '/admin/quests', icon: Swords, labelKey: 'quests' },
    { href: '/admin/documents', icon: FileText, labelKey: 'documents' },
    { href: '/admin/rewards', icon: Trophy, labelKey: 'rewards' },
    { href: '/admin/tools', icon: Wrench, labelKey: 'tools' },
    { href: '/admin/settings', icon: Cog, labelKey: 'settings' },
    { href: '/admin/analytics', icon: BarChart3, labelKey: 'analytics' },
    { href: '/admin/system', icon: Settings, labelKey: 'system' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
            {t('admin.title')}
          </span>
          <span className="font-medium">{t('admin.management')}</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                {t('admin.panel')}
              </span>
            </div>

            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={isActive(item.href) ? 'secondary' : 'ghost'}
                  className={`shadow-none my-1 w-full justify-start ${
                    isActive(item.href) ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {t(`admin.nav.${item.labelKey}`)}
                </Button>
              </Link>
            ))}

            <div className="mt-8 pt-4 border-t border-gray-200">
              <Link href="/dashboard" passHref>
                <Button
                  variant="ghost"
                  className="shadow-none w-full justify-start text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('admin.backToDashboard')}
                </Button>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
