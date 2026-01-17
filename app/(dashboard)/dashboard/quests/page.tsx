'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import useSWR from 'swr';
import {
  CheckCircle2,
  Lock,
  Circle,
  ChevronRight,
  Library,
  BookOpen,
  Trophy,
  Star,
  Flame,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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

type QuestsData = {
  books: Book[];
  chapters: Chapter[];
  quests: Quest[];
  progress: QuestProgress[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// クエストカード
function QuestCard({ quest, status }: { quest: Quest; status: 'locked' | 'available' | 'completed' }) {
  const { locale, t } = useLocale();
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  const title = getLocalizedText(quest.title, locale);
  const description = getLocalizedText(quest.description, locale);

  return (
    <Card className={`transition-all ${isLocked ? 'opacity-50' : 'hover:shadow-md hover:border-orange-200'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : isLocked ? (
              <Lock className="h-5 w-5 text-gray-400" />
            ) : (
              <Circle className="h-5 w-5 text-orange-500" />
            )}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={isCompleted ? 'default' : isLocked ? 'secondary' : 'outline'} className="text-xs">
            {quest.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-3 text-sm line-clamp-2">{description}</CardDescription>
        {!isLocked && (
          <Link href={`/dashboard/quests/${quest.slug}`}>
            <Button
              variant={isCompleted ? 'outline' : 'default'}
              className={!isCompleted ? 'bg-orange-500 hover:bg-orange-600' : ''}
              size="sm"
            >
              {isCompleted ? t('quests.completed') : t('quests.available')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// チャプターアコーディオン
function ChapterSection({
  chapter,
  quests,
  progress,
  isExpanded,
  onToggle,
}: {
  chapter: Chapter;
  quests: Quest[];
  progress: QuestProgress[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { locale } = useLocale();
  const chapterQuests = quests.filter(q => q.chapterId === chapter.id);
  const completedCount = chapterQuests.filter(q =>
    progress.find(p => p.questId === q.id)?.status === 'completed'
  ).length;
  const progressPercent = chapterQuests.length > 0 ? (completedCount / chapterQuests.length) * 100 : 0;

  const getQuestStatus = (questId: number): 'locked' | 'available' | 'completed' => {
    const p = progress.find(p => p.questId === questId);
    return p?.status || 'locked';
  };

  return (
    <div id={`chapter-${chapter.slug}`} className="border rounded-lg overflow-hidden scroll-mt-4">
      <button
        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${
          isExpanded ? 'bg-muted/30 border-b' : ''
        }`}
        onClick={onToggle}
      >
        <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{getLocalizedText(chapter.title, locale)}</h3>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Progress value={progressPercent} className="w-20 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedCount}/{chapterQuests.length}
          </span>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 space-y-3 bg-muted/10">
          {chapterQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} status={getQuestStatus(quest.id)} />
          ))}
          {chapterQuests.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No quests in this chapter</p>
          )}
        </div>
      )}
    </div>
  );
}

// リワードカード
function RewardsCard({ completedQuests, totalQuests }: { completedQuests: number; totalQuests: number }) {
  const progress = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

  // マイルストーン計算
  const milestones = [
    { threshold: 25, label: 'Beginner', icon: Star },
    { threshold: 50, label: 'Intermediate', icon: Flame },
    { threshold: 100, label: 'Master', icon: Trophy },
  ];

  const currentMilestone = milestones.filter(m => progress >= m.threshold).pop();
  const nextMilestone = milestones.find(m => progress < m.threshold);

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
      <div className="flex items-center gap-2">
        {currentMilestone ? (
          <currentMilestone.icon className="h-6 w-6 text-amber-500" />
        ) : (
          <Star className="h-6 w-6 text-gray-300" />
        )}
        <div>
          <p className="text-sm font-medium text-amber-900">
            {currentMilestone?.label || 'Getting Started'}
          </p>
          <p className="text-xs text-amber-700">
            {completedQuests}/{totalQuests} quests completed
          </p>
        </div>
      </div>
      <div className="flex-1">
        <Progress value={progress} className="h-2" />
      </div>
      {nextMilestone && (
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Next: {nextMilestone.label}</p>
          <p className="text-xs text-amber-600">{nextMilestone.threshold}%</p>
        </div>
      )}
    </div>
  );
}

export default function QuestsPage() {
  const { locale, t } = useLocale();
  const { data, isLoading, error } = useSWR<QuestsData>('/api/quests', fetcher);
  const searchParams = useSearchParams();
  const router = useRouter();

  // URLパラメータから選択状態を取得
  const bookSlug = searchParams.get('book');
  const expandedChapterSlug = searchParams.get('chapter');

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-6">
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
          <div className="h-16 bg-gray-100 rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="flex-1 p-4 lg:p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">{t('common.error')}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // 選択中のBook
  const selectedBook = data.books.find(b => b.slug === bookSlug) || (data.books.length > 0 ? data.books[0] : null);

  // 選択中のBookに属するChapter
  const bookChapters = selectedBook
    ? data.chapters.filter(c => c.bookId === selectedBook.id).sort((a, b) => a.order - b.order)
    : [];

  // URL更新関数
  const handleBookSelect = (slug: string) => {
    router.push(`/dashboard/quests?book=${slug}`, { scroll: false });
  };

  const handleChapterToggle = (chapterSlug: string) => {
    if (expandedChapterSlug === chapterSlug) {
      // 閉じる
      router.push(`/dashboard/quests?book=${selectedBook?.slug}`, { scroll: false });
    } else {
      // 開く
      router.push(`/dashboard/quests?book=${selectedBook?.slug}&chapter=${chapterSlug}`, { scroll: false });
    }
  };

  // 全体の進捗計算
  const totalQuests = data.quests.length;
  const completedQuests = data.progress.filter(p => p.status === 'completed').length;

  // Book別進捗計算
  const getBookProgress = (bookId: number) => {
    const bookChapterIds = data.chapters.filter(c => c.bookId === bookId).map(c => c.id);
    const bookQuests = data.quests.filter(q => q.chapterId && bookChapterIds.includes(q.chapterId));
    const completed = bookQuests.filter(q =>
      data.progress.find(p => p.questId === q.id)?.status === 'completed'
    ).length;
    return { completed, total: bookQuests.length };
  };

  // Bookがない場合のフォールバック
  if (data.books.length === 0) {
    return (
      <section className="flex-1 p-4 lg:p-6">
        <div className="mb-6">
          <RewardsCard completedQuests={completedQuests} totalQuests={totalQuests} />
        </div>
        <div className="space-y-3">
          {data.chapters.map((chapter) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              quests={data.quests}
              progress={data.progress}
              isExpanded={expandedChapterSlug === chapter.slug}
              onToggle={() => handleChapterToggle(chapter.slug)}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-6">
      {/* 上部ヘッダー: 本棚タブ + リワード */}
      <div className="space-y-4 mb-6">
        {/* リワード表示 */}
        <RewardsCard completedQuests={completedQuests} totalQuests={totalQuests} />

        {/* 本棚タブ */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {data.books.map((book) => {
            const isSelected = selectedBook?.id === book.id;
            const bookProgress = getBookProgress(book.id);
            const progressPercent = bookProgress.total > 0
              ? Math.round((bookProgress.completed / bookProgress.total) * 100)
              : 0;

            return (
              <button
                key={book.id}
                onClick={() => handleBookSelect(book.slug)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-orange-50 border-orange-300 text-orange-900'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Library className={`h-4 w-4 ${isSelected ? 'text-orange-600' : 'text-purple-600'}`} />
                <span className="font-medium">{getLocalizedText(book.title, locale)}</span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${isSelected ? 'bg-orange-100 text-orange-700' : ''}`}
                >
                  {progressPercent}%
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択中のBook情報 */}
      {selectedBook && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{getLocalizedText(selectedBook.title, locale)}</h1>
              {selectedBook.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {getLocalizedText(selectedBook.description, locale)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {getBookProgress(selectedBook.id).completed}/{getBookProgress(selectedBook.id).total} quests
              </p>
            </div>
          </div>
        </div>
      )}

      {/* チャプター一覧 */}
      <div className="space-y-3">
        {bookChapters.length > 0 ? (
          bookChapters.map((chapter) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              quests={data.quests}
              progress={data.progress}
              isExpanded={expandedChapterSlug === chapter.slug}
              onToggle={() => handleChapterToggle(chapter.slug)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No chapters in this book yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
