'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import { BookOpen, FileText, Loader2, Swords, Library, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/context';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

type DocumentItem = {
  id: number;
  title: LocalizedText;
  contentType: string;
};

type QuestWithDocs = {
  id: number;
  slug: string;
  title: LocalizedText;
  documents: DocumentItem[];
};

type ChapterWithDocs = {
  id: number;
  slug: string;
  title: LocalizedText;
  documents: DocumentItem[];
  quests: QuestWithDocs[];
};

type BookWithDocs = {
  id: number;
  slug: string;
  title: LocalizedText;
  documents: DocumentItem[];
  chapters: ChapterWithDocs[];
};

type HierarchyResponse = {
  hierarchy: BookWithDocs[];
  orphanChapters: ChapterWithDocs[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// コンテンツタイプのラベル
const CONTENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  faq: { label: 'FAQ', color: 'bg-blue-100 text-blue-700' },
  guide: { label: 'Guide', color: 'bg-green-100 text-green-700' },
  troubleshoot: { label: 'Troubleshoot', color: 'bg-amber-100 text-amber-700' },
};

// ドキュメントリンクコンポーネント
function DocumentLink({ doc, locale }: { doc: DocumentItem; locale: string }) {
  const title = getLocalizedText(doc.title, locale as 'en' | 'ja' | 'es' | 'zh' | 'ko');
  const contentTypeInfo = CONTENT_TYPE_LABELS[doc.contentType] || {
    label: doc.contentType,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <Link
      href={`/dashboard/docs/${doc.id}`}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border ml-6"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{title}</span>
      </div>
      <Badge className={`${contentTypeInfo.color} text-xs`}>
        {contentTypeInfo.label}
      </Badge>
    </Link>
  );
}

// クエストセクションコンポーネント
function QuestSection({ quest, locale }: { quest: QuestWithDocs; locale: string }) {
  const title = getLocalizedText(quest.title, locale as 'en' | 'ja' | 'es' | 'zh' | 'ko');

  if (quest.documents.length === 0) return null;

  return (
    <div className="ml-4 border-l-2 border-gray-200 pl-4 py-2">
      <Link
        href={`/dashboard/quests/${quest.slug}`}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors mb-2"
      >
        <Swords className="h-4 w-4 text-orange-400" />
        {title}
        <ChevronRight className="h-3 w-3" />
      </Link>
      <div className="space-y-1">
        {quest.documents.map((doc) => (
          <DocumentLink key={doc.id} doc={doc} locale={locale} />
        ))}
      </div>
    </div>
  );
}

// チャプターセクションコンポーネント
function ChapterSection({ chapter, locale }: { chapter: ChapterWithDocs; locale: string }) {
  const title = getLocalizedText(chapter.title, locale as 'en' | 'ja' | 'es' | 'zh' | 'ko');
  const hasContent = chapter.documents.length > 0 || chapter.quests.some(q => q.documents.length > 0);

  if (!hasContent) return null;

  return (
    <div className="ml-4 border-l-2 border-orange-200 pl-4 py-3">
      <div className="flex items-center gap-2 font-medium text-gray-800 mb-3">
        <BookOpen className="h-4 w-4 text-orange-500" />
        {title}
      </div>

      {/* チャプター直属のドキュメント */}
      {chapter.documents.length > 0 && (
        <div className="space-y-1 mb-3">
          {chapter.documents.map((doc) => (
            <DocumentLink key={doc.id} doc={doc} locale={locale} />
          ))}
        </div>
      )}

      {/* クエスト */}
      {chapter.quests.map((quest) => (
        <QuestSection key={quest.id} quest={quest} locale={locale} />
      ))}
    </div>
  );
}

// ブックセクションコンポーネント
function BookSection({ book, locale }: { book: BookWithDocs; locale: string }) {
  const title = getLocalizedText(book.title, locale as 'en' | 'ja' | 'es' | 'zh' | 'ko');
  const hasContent = book.documents.length > 0 || book.chapters.some(c =>
    c.documents.length > 0 || c.quests.some(q => q.documents.length > 0)
  );

  if (!hasContent) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* ブック直属のドキュメント */}
        {book.documents.length > 0 && (
          <div className="space-y-1 mb-4">
            {book.documents.map((doc) => (
              <DocumentLink key={doc.id} doc={doc} locale={locale} />
            ))}
          </div>
        )}

        {/* チャプター */}
        <div className="space-y-2">
          {book.chapters.map((chapter) => (
            <ChapterSection key={chapter.id} chapter={chapter} locale={locale} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DocumentsPage() {
  const { locale, t } = useLocale();

  const { data, isLoading, error } = useSWR<HierarchyResponse>(
    '/api/docs',
    fetcher
  );

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Failed to load documents
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const { hierarchy = [], orphanChapters = [] } = data || {};
  const hasContent = hierarchy.length > 0 || orphanChapters.length > 0;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('docs.title') || 'Documents'}</h1>
        <p className="text-muted-foreground mt-1">
          {t('docs.description') || 'Browse help documents and guides for quests'}
        </p>
      </div>

      {!hasContent ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('docs.empty') || 'No documents available yet'}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ブックごとの階層表示 */}
          {hierarchy.map((book) => (
            <BookSection key={book.id} book={book} locale={locale} />
          ))}

          {/* ブックに属さないチャプター */}
          {orphanChapters.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-600">Other</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {orphanChapters.map((chapter) => (
                  <ChapterSection key={chapter.id} chapter={chapter} locale={locale} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
