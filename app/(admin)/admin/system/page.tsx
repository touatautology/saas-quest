'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Database, AlertCircle, CheckCircle } from 'lucide-react';

type ImportResult = {
  success: boolean;
  imported?: {
    books: number;
    chapters: number;
    quests: number;
    rewards: number;
    documents: number;
  };
  error?: string;
};

export default function SystemPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // エクスポート処理
  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/system/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const data = await response.json();

      // JSONファイルとしてダウンロード
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saas-quest-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: `Export failed: ${error}` });
    } finally {
      setExporting(false);
    }
  };

  // インポート処理
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/admin/system/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result: ImportResult = await response.json();

      if (result.success && result.imported) {
        setMessage({
          type: 'success',
          text: `Imported: ${result.imported.books} books, ${result.imported.chapters} chapters, ${result.imported.quests} quests, ${result.imported.rewards} rewards, ${result.imported.documents} documents`,
        });
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Import failed: ${error}` });
    } finally {
      setImporting(false);
      // ファイル入力をリセット
      event.target.value = '';
    }
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        System
      </h1>

      {/* メッセージ表示 */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* エクスポート */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Export all quests, chapters, books, rewards, and documents as JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Downloads a JSON file containing all content data. User data and progress are not included.
            </p>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export to JSON'}
            </Button>
          </CardContent>
        </Card>

        {/* インポート */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Import content data from a previously exported JSON file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              <span className="text-red-600 font-medium">Warning:</span> This will delete all existing content data (quests, chapters, books, rewards, documents) and replace with imported data.
            </p>
            <label className="inline-block">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
              <Button asChild disabled={importing}>
                <span>{importing ? 'Importing...' : 'Import from JSON'}</span>
              </Button>
            </label>
          </CardContent>
        </Card>

        {/* DB統計 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Overview
            </CardTitle>
            <CardDescription>
              Current data statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataStats />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// DB統計コンポーネント
function DataStats() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/system/export');
      if (response.ok) {
        const data = await response.json();
        setStats({
          Books: data.data.books?.length || 0,
          Chapters: data.data.chapters?.length || 0,
          Quests: data.data.quests?.length || 0,
          Rewards: data.data.rewards?.length || 0,
          Documents: data.data.documents?.length || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return (
      <Button variant="outline" onClick={loadStats} disabled={loading}>
        {loading ? 'Loading...' : 'Load Statistics'}
      </Button>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {Object.entries(stats).map(([key, value]) => (
        <div key={key} className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600">{key}</div>
        </div>
      ))}
    </div>
  );
}
