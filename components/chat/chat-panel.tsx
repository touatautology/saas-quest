'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import {
  Bot,
  X,
  MessageCircle,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: number; title: string }[] | null;
};

type ChatHistory = {
  sessionId: number | null;
  messages: Message[];
};

type UserSettings = {
  aiChatEnabled: boolean;
  hasApiKey: boolean;
};

type ChatPanelProps = {
  questId: number;
  questTitle: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatPanel({ questId, questTitle }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ユーザー設定を取得
  const { data: settings, isLoading: isLoadingSettings } = useSWR<UserSettings>(
    '/api/user/settings',
    fetcher
  );

  // チャット履歴を取得
  const { data: history, isLoading: isLoadingHistory } = useSWR<ChatHistory>(
    isOpen && settings?.aiChatEnabled
      ? `/api/quests/chat?questId=${questId}`
      : null,
    fetcher
  );

  // 履歴を読み込んだらメッセージを設定
  useEffect(() => {
    if (history) {
      setMessages(history.messages);
      setSessionId(history.sessionId);
    }
  }, [history]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message: string) => {
    setIsLoading(true);
    setError(null);

    // ユーザーメッセージを即座に表示
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/quests/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId,
          sessionId,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'エラーが発生しました');
        // ユーザーメッセージを削除
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          sources: data.message.sources,
        },
      ]);
    } catch {
      setError('通信エラーが発生しました');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // APIキー未設定の場合
  const renderSetupPrompt = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <AlertCircle className="h-12 w-12 text-orange-400 mb-4" />
      <h3 className="font-medium mb-2">AIチャットを有効にしてください</h3>
      <p className="text-sm text-muted-foreground mb-4">
        質問するには、設定画面でGemini APIキーを登録する必要があります
      </p>
      <Link href="/dashboard/general">
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Settings className="mr-2 h-4 w-4" />
          設定画面へ
        </Button>
      </Link>
    </div>
  );

  // チャットコンテンツ
  const renderChatContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 text-orange-400" />
            <p>「{questTitle}」について質問してみましょう</p>
            <p className="text-sm mt-2">
              例: 「この手順がうまくいかないのですが...」
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4 rounded-lg bg-orange-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    考え中...
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="p-4 border-t">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );

  return (
    <>
      {/* チャットボタン */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* チャットパネル */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl flex flex-col">
          <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">AIヘルプ</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden">
            {isLoadingSettings ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : settings?.aiChatEnabled && settings?.hasApiKey ? (
              renderChatContent()
            ) : (
              renderSetupPrompt()
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
