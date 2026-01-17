'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Circle,
  Lock,
  RotateCcw,
  Library,
  BookOpen,
  ScrollText,
  ChevronRight,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLocale } from '@/lib/i18n/context';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

type Book = {
  id: number;
  slug: string;
  title: LocalizedText;
  description: LocalizedText | null;
  order: number;
};

type Chapter = {
  id: number;
  slug: string;
  title: LocalizedText;
  description: LocalizedText | null;
  bookId: number | null;
  order: number;
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

type TeamInfo = {
  teamId: number;
  teamName: string;
  role: string;
  planName: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
} | null;

type UserProgressData = {
  user: {
    id: number;
    name: string | null;
    email: string;
    createdAt: string;
  };
  team: TeamInfo;
  books: Book[];
  chapters: Chapter[];
  quests: Quest[];
  progress: QuestProgress[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StatusIcon({ status }: { status: 'locked' | 'available' | 'completed' }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'available':
      return <Circle className="h-4 w-4 text-orange-500" />;
    default:
      return <Lock className="h-4 w-4 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: 'locked' | 'available' | 'completed' }) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'available':
      return <Badge className="bg-orange-100 text-orange-800">Available</Badge>;
    default:
      return <Badge variant="secondary">Locked</Badge>;
  }
}

export default function UserProgressPage() {
  const { locale } = useLocale();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [isResetting, setIsResetting] = useState<string | null>(null);

  const { data, isLoading, error } = useSWR<UserProgressData>(
    `/api/admin/users/${userId}/progress`,
    fetcher
  );

  const toggleBook = (bookId: number) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const handleReset = async (
    type: 'quest' | 'chapter' | 'book' | 'all',
    id?: number
  ) => {
    const key = type === 'all' ? 'all' : `${type}-${id}`;
    setIsResetting(key);

    try {
      let url = `/api/admin/users/${userId}/progress?`;
      switch (type) {
        case 'quest':
          url += `questId=${id}`;
          break;
        case 'chapter':
          url += `chapterId=${id}`;
          break;
        case 'book':
          url += `bookId=${id}`;
          break;
        case 'all':
          url += 'all=true';
          break;
      }

      const response = await fetch(url, { method: 'DELETE' });

      if (response.ok) {
        mutate(`/api/admin/users/${userId}/progress`);
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to reset progress');
      }
    } catch {
      alert('Failed to reset progress');
    } finally {
      setIsResetting(null);
    }
  };

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="text-red-500">Failed to load user progress</div>
      </section>
    );
  }

  const { user, team, books, chapters, quests, progress } = data;

  // 進捗マップを作成
  const progressMap = new Map(progress.map((p) => [p.questId, p]));

  // 統計計算
  const totalQuests = quests.length;
  const completedQuests = progress.filter((p) => p.status === 'completed').length;
  const overallProgress = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

  // Book → Chapter → Quest の階層計算
  const getBookStats = (bookId: number) => {
    const bookChapters = chapters.filter((c) => c.bookId === bookId);
    const chapterIds = bookChapters.map((c) => c.id);
    const bookQuests = quests.filter((q) => q.chapterId && chapterIds.includes(q.chapterId));
    const completed = bookQuests.filter((q) => progressMap.get(q.id)?.status === 'completed').length;
    return { total: bookQuests.length, completed };
  };

  const getChapterStats = (chapterId: number) => {
    const chapterQuests = quests.filter((q) => q.chapterId === chapterId);
    const completed = chapterQuests.filter((q) => progressMap.get(q.id)?.status === 'completed').length;
    return { total: chapterQuests.length, completed };
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
            User Progress
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>

      {/* ユーザー情報・サブスクリプションカード */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* ユーザー情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{user.name || 'No Name'}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isResetting === 'all'}
                  >
                    {isResetting === 'all' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Progress</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset ALL quest progress for this user. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleReset('all')}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Reset All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">
                  {format(new Date(user.createdAt), 'yyyy/MM/dd', { locale: ja })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2">
                  <Progress value={overallProgress} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quests</p>
                <p className="font-medium">{totalQuests}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium text-green-600">{completedQuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* サブスクリプション情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Subscription</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {team ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Team</p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{team.teamName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge variant="outline">{team.role}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <Badge
                      className={
                        team.planName
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {team.planName || 'Free'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        team.subscriptionStatus === 'active'
                          ? 'default'
                          : team.subscriptionStatus === 'trialing'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className={
                        team.subscriptionStatus === 'active'
                          ? 'bg-green-100 text-green-800'
                          : ''
                      }
                    >
                      {team.subscriptionStatus || 'No subscription'}
                    </Badge>
                  </div>
                </div>
                {team.stripeCustomerId && (
                  <div className="pt-2 border-t">
                    <a
                      href={`https://dashboard.stripe.com/customers/${team.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View in Stripe Dashboard
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No team membership</p>
                <p className="text-sm mt-1">User has not joined any team yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* クエスト進捗一覧（既存コード） */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Quest Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Books</p>
            <p className="font-medium">{books.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Chapters</p>
            <p className="font-medium">{chapters.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Quests</p>
            <p className="font-medium">{totalQuests}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={overallProgress} className="flex-1 h-2" />
              <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 進捗一覧 */}
      <div className="space-y-4">
        {books.map((book) => {
          const bookStats = getBookStats(book.id);
          const bookChapters = chapters.filter((c) => c.bookId === book.id);
          const isBookExpanded = expandedBooks.has(book.id);
          const bookProgress = bookStats.total > 0
            ? (bookStats.completed / bookStats.total) * 100
            : 0;

          return (
            <Card key={book.id}>
              <CardHeader className="pb-2">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleBook(book.id)}
                >
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Library className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isBookExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">
                        {getLocalizedText(book.title, locale)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Progress value={bookProgress} className="w-32 h-2" />
                      <span className="text-sm text-muted-foreground">
                        {bookStats.completed}/{bookStats.total}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isResetting === `book-${book.id}`}
                      >
                        {isResetting === `book-${book.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Book Progress</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset all quest progress in "{getLocalizedText(book.title, locale)}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleReset('book', book.id)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>

              {isBookExpanded && (
                <CardContent className="pt-2">
                  <div className="space-y-3 ml-4">
                    {bookChapters.map((chapter) => {
                      const chapterStats = getChapterStats(chapter.id);
                      const chapterQuests = quests.filter((q) => q.chapterId === chapter.id);
                      const isChapterExpanded = expandedChapters.has(chapter.id);
                      const chapterProgress = chapterStats.total > 0
                        ? (chapterStats.completed / chapterStats.total) * 100
                        : 0;

                      return (
                        <div key={chapter.id} className="border rounded-lg p-3">
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => toggleChapter(chapter.id)}
                          >
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {isChapterExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="font-medium">
                                  {getLocalizedText(chapter.title, locale)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={chapterProgress} className="w-24 h-1.5" />
                                <span className="text-xs text-muted-foreground">
                                  {chapterStats.completed}/{chapterStats.total}
                                </span>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-orange-600 hover:bg-orange-50"
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={isResetting === `chapter-${chapter.id}`}
                                >
                                  {isResetting === `chapter-${chapter.id}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3 w-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Chapter Progress</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reset all quest progress in "{getLocalizedText(chapter.title, locale)}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReset('chapter', chapter.id)}
                                    className="bg-orange-500 hover:bg-orange-600"
                                  >
                                    Reset
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {isChapterExpanded && (
                            <div className="mt-3 space-y-2 ml-6">
                              {chapterQuests.map((quest) => {
                                const questProgress = progressMap.get(quest.id);
                                const status = questProgress?.status || 'locked';

                                return (
                                  <div
                                    key={quest.id}
                                    className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                                  >
                                    <StatusIcon status={status} />
                                    <ScrollText className="h-3 w-3 text-green-600" />
                                    <span className="flex-1 text-sm">
                                      {getLocalizedText(quest.title, locale)}
                                    </span>
                                    <StatusBadge status={status} />
                                    {status === 'completed' && questProgress?.completedAt && (
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(questProgress.completedAt), 'MM/dd HH:mm')}
                                      </span>
                                    )}
                                    {status === 'completed' && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50"
                                            disabled={isResetting === `quest-${quest.id}`}
                                          >
                                            {isResetting === `quest-${quest.id}` ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <RotateCcw className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Reset Quest Progress</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will reset the progress for "{getLocalizedText(quest.title, locale)}".
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleReset('quest', quest.id)}
                                              className="bg-orange-500 hover:bg-orange-600"
                                            >
                                              Reset
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* 未割当のチャプター/クエスト */}
        {(() => {
          const unassignedChapters = chapters.filter((c) => !c.bookId);
          const unassignedQuests = quests.filter((q) => !q.chapterId);

          if (unassignedChapters.length === 0 && unassignedQuests.length === 0) {
            return null;
          }

          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">
                  Unassigned Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unassignedChapters.map((chapter) => {
                  const chapterStats = getChapterStats(chapter.id);
                  const chapterQuests = quests.filter((q) => q.chapterId === chapter.id);
                  const isChapterExpanded = expandedChapters.has(chapter.id);

                  return (
                    <div key={chapter.id} className="border rounded-lg p-3 mb-3">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleChapter(chapter.id)}
                      >
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="flex-1 font-medium">
                          {getLocalizedText(chapter.title, locale)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chapterStats.completed}/{chapterStats.total}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600 hover:bg-orange-50"
                              onClick={(e) => e.stopPropagation()}
                              disabled={isResetting === `chapter-${chapter.id}`}
                            >
                              {isResetting === `chapter-${chapter.id}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reset Chapter Progress</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will reset all quest progress in "{getLocalizedText(chapter.title, locale)}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleReset('chapter', chapter.id)}
                                className="bg-orange-500 hover:bg-orange-600"
                              >
                                Reset
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {isChapterExpanded && (
                        <div className="mt-3 space-y-2 ml-6">
                          {chapterQuests.map((quest) => {
                            const questProgress = progressMap.get(quest.id);
                            const status = questProgress?.status || 'locked';
                            return (
                              <div
                                key={quest.id}
                                className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                              >
                                <StatusIcon status={status} />
                                <span className="flex-1 text-sm">
                                  {getLocalizedText(quest.title, locale)}
                                </span>
                                <StatusBadge status={status} />
                                {status === 'completed' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50"
                                        disabled={isResetting === `quest-${quest.id}`}
                                      >
                                        {isResetting === `quest-${quest.id}` ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <RotateCcw className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reset Quest Progress</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will reset the progress for "{getLocalizedText(quest.title, locale)}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleReset('quest', quest.id)}
                                          className="bg-orange-500 hover:bg-orange-600"
                                        >
                                          Reset
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {unassignedQuests.map((quest) => {
                  const questProgress = progressMap.get(quest.id);
                  const status = questProgress?.status || 'locked';
                  return (
                    <div
                      key={quest.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50 mb-2"
                    >
                      <StatusIcon status={status} />
                      <span className="flex-1 text-sm">
                        {getLocalizedText(quest.title, locale)}
                      </span>
                      <StatusBadge status={status} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </section>
  );
}
