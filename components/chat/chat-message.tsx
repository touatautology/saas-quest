'use client';

import Link from 'next/link';
import { Bot, User, BookOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type Source = {
  id: number;
  title: string;
};

type ChatMessageProps = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[] | null;
};

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser ? 'bg-muted/50' : 'bg-orange-50'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-gray-200' : 'bg-orange-100'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-gray-600" />
        ) : (
          <Bot className="h-4 w-4 text-orange-600" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="text-sm whitespace-pre-wrap">{content}</div>

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-muted-foreground mr-1">Sources:</span>
            {sources.map((source) => (
              <Link
                key={source.id}
                href={`/dashboard/docs/${source.id}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full hover:bg-orange-200 transition-colors"
              >
                <BookOpen className="h-3 w-3" />
                {source.title}
                <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
