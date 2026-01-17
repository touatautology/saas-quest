'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Users,
  Settings,
  Shield,
  Activity,
  Menu,
  Swords,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Server,
  FileText,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // デフォルトはCollapsed
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLocale();

  // ローカルストレージからサイドバー状態を復元
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
    // 初回訪問時（localStorageが未設定）はデフォルトのtrue（Collapsed）を維持
  }, []);

  // サイドバー状態を保存
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  useEffect(() => {
    fetch('/api/user')
      .then((res) => res.json())
      .then((data) => {
        if (data?.role === 'admin') {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: '/dashboard/quests', icon: Swords, label: t('nav.quests') },
    { href: '/dashboard/docs', icon: FileText, label: t('nav.docs') || 'Docs' },
    { href: '/dashboard/server-config', icon: Server, label: t('nav.serverConfig') || 'Server Config' },
    { href: '/dashboard', icon: Users, label: t('nav.team') },
    { href: '/dashboard/general', icon: Settings, label: t('nav.general') },
    { href: '/dashboard/activity', icon: Activity, label: t('nav.activity') },
    { href: '/dashboard/security', icon: Shield, label: t('nav.security') },
    ...(isAdmin ? [{ href: '/admin', icon: LayoutDashboard, label: t('nav.admin') }] : []),
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
          <div className="flex items-center">
            <span className="font-medium">{t('nav.dashboard')}</span>
          </div>
          <Button
            className="-mr-3"
            variant="ghost"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`${
              isCollapsed ? 'w-16' : 'w-56'
            } bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
              isMobileSidebarOpen ? 'block' : 'hidden'
            } lg:sticky lg:top-0 lg:self-start lg:h-[calc(100dvh-68px)] absolute inset-y-0 left-0 z-40 transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } flex-shrink-0`}
          >
            <nav className="h-full overflow-hidden p-2 flex flex-col">
              <div className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href === '/dashboard/quests' && pathname.startsWith('/dashboard/quests'));

                  const button = (
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={`shadow-none w-full ${
                        isCollapsed ? 'justify-center px-2' : 'justify-start'
                      } ${isActive ? 'bg-gray-100' : ''}`}
                      onClick={() => setIsMobileSidebarOpen(false)}
                    >
                      <item.icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Button>
                  );

                  return (
                    <Link key={item.href} href={item.href}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        button
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Collapse toggle button */}
              <div className="hidden lg:block pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                  onClick={toggleCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      <span className="text-xs text-muted-foreground">Collapse</span>
                    </>
                  )}
                </Button>
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
