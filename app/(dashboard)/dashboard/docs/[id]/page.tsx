'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { ArrowLeft, BookOpen, FileText, Library, List, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/context';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

type DocumentData = {
  document: {
    id: number;
    title: LocalizedText;
    content: LocalizedText;
    contentType: string;
    bookId: number | null;
    chapterId: number | null;
    questId: number | null;
  };
  parent: {
    type: 'book' | 'chapter' | 'quest';
    slug: string;
    title: LocalizedText;
  } | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// コンテンツタイプのラベル
const CONTENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  faq: { label: 'FAQ', color: 'bg-blue-100 text-blue-700' },
  guide: { label: 'Guide', color: 'bg-green-100 text-green-700' },
  troubleshoot: { label: 'Troubleshoot', color: 'bg-amber-100 text-amber-700' },
};

// Markdownのシンプルなレンダリング（基本的な要素のみ）
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // コードブロックの開始/終了
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // コードブロック終了
        elements.push(
          <pre key={i} className="bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto my-4 text-sm">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // コードブロック開始
        codeBlockLang = line.slice(3);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // 見出し
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold mt-6 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-semibold mt-6 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold mt-6 mb-4">
          {line.slice(2)}
        </h1>
      );
    }
    // リスト項目
    else if (line.match(/^[-*] /)) {
      elements.push(
        <li key={i} className="ml-4 list-disc">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
    }
    // 番号付きリスト
    else if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <li key={i} className="ml-4 list-decimal">
            {renderInlineFormatting(match[2])}
          </li>
        );
      }
    }
    // チェックボックス
    else if (line.match(/^- \[[ x]\] /)) {
      const checked = line.includes('[x]');
      const text = line.replace(/^- \[[ x]\] /, '');
      elements.push(
        <div key={i} className="flex items-center gap-2 ml-4">
          <input type="checkbox" checked={checked} readOnly className="h-4 w-4" />
          <span className={checked ? 'line-through text-muted-foreground' : ''}>
            {text}
          </span>
        </div>
      );
    }
    // 空行
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // 通常のテキスト
    else {
      elements.push(
        <p key={i} className="my-2">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  return <div className="prose max-w-none">{elements}</div>;
}

// インライン書式のレンダリング
function renderInlineFormatting(text: string): React.ReactNode {
  // インラインコード
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-gray-100 text-orange-600 px-1 py-0.5 rounded text-sm">
          {part.slice(1, -1)}
        </code>
      );
    }
    // ボールド
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${i}-${j}`}>{bp.slice(2, -2)}</strong>;
      }
      return bp;
    });
  });
}

export default function DocumentDetailPage() {
  const params = useParams();
  const { locale, t } = useLocale();
  const id = params.id as string;

  const { data, isLoading, error } = useSWR<DocumentData>(
    `/api/docs/${id}`,
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

  if (error || !data?.document) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Document not found
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const { document: doc, parent } = data;
  const title = getLocalizedText(doc.title, locale);
  const content = getLocalizedText(doc.content, locale);
  const contentTypeInfo = CONTENT_TYPE_LABELS[doc.contentType] || {
    label: doc.contentType,
    color: 'bg-gray-100 text-gray-700',
  };

  // 親へのリンク
  const getParentLink = () => {
    if (!parent) return null;
    if (parent.type === 'quest') {
      return `/dashboard/quests/${parent.slug}`;
    }
    // ブックやチャプターの場合は将来的に専用ページを追加可能
    return null;
  };

  const parentLink = getParentLink();
  const parentTitle = parent ? getLocalizedText(parent.title, locale) : null;

  // 親タイプのアイコン
  const ParentIcon = parent?.type === 'book' ? Library : parent?.type === 'chapter' ? BookOpen : List;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/dashboard/docs"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <FileText className="mr-2 h-4 w-4" />
          {t('docs.title') || 'Documents'}
        </Link>
        {parentLink && (
          <>
            <span className="text-muted-foreground">/</span>
            <Link
              href={parentLink}
              className="inline-flex items-center text-muted-foreground hover:text-foreground"
            >
              <ParentIcon className="mr-2 h-4 w-4" />
              {parentTitle}
            </Link>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl lg:text-2xl">{title}</CardTitle>
            <Badge className={contentTypeInfo.color}>{contentTypeInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mt-2">{renderMarkdown(content)}</div>
        </CardContent>
      </Card>
    </section>
  );
}
