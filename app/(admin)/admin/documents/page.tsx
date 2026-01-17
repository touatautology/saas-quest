'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Pencil, Plus, RefreshCw, Check, X, Library, BookOpen, List } from 'lucide-react';
import { Quest, QuestDocument, Chapter, Book } from '@/lib/db/schema';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';

// ヘルパー: JSONB LocalizedTextから英語版を取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  return getLocalizedText(text, 'en');
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CONTENT_TYPES = [
  { value: 'faq', label: 'FAQ' },
  { value: 'guide', label: 'Guide' },
  { value: 'troubleshoot', label: 'Troubleshoot' },
];

// ターゲットタイプ
type TargetType = 'book' | 'chapter' | 'quest';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URLパラメータから初期値を取得
  const urlBookId = searchParams.get('bookId');
  const urlChapterId = searchParams.get('chapterId');
  const urlQuestId = searchParams.get('questId');

  const [targetType, setTargetType] = useState<TargetType>(() => {
    if (urlBookId) return 'book';
    if (urlChapterId) return 'chapter';
    return 'quest';
  });
  const [selectedBookId, setSelectedBookId] = useState<string>(urlBookId || '');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(urlChapterId || '');
  const [selectedQuestId, setSelectedQuestId] = useState<string>(urlQuestId || '');

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const [editingDoc, setEditingDoc] = useState<QuestDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // データ取得
  const { data: booksData } = useSWR<{ books: Book[] }>('/api/admin/books', fetcher);
  const { data: chaptersData } = useSWR<{ chapters: Chapter[] }>('/api/admin/chapters', fetcher);
  const { data: questsData } = useSWR<{ quests: Quest[] }>('/api/admin/quests', fetcher);

  // フィルタ用クエリパラメータを構築
  const getFilterParam = () => {
    if (targetType === 'book' && selectedBookId) {
      return `bookId=${selectedBookId}`;
    }
    if (targetType === 'chapter' && selectedChapterId) {
      return `chapterId=${selectedChapterId}`;
    }
    if (targetType === 'quest' && selectedQuestId) {
      return `questId=${selectedQuestId}`;
    }
    return '';
  };

  const filterParam = getFilterParam();
  const { data: docsData, isLoading } = useSWR<{ documents: QuestDocument[] }>(
    filterParam ? `/api/admin/documents?${filterParam}` : '/api/admin/documents',
    fetcher
  );

  // URL同期
  useEffect(() => {
    const params = new URLSearchParams();
    if (targetType === 'book' && selectedBookId) {
      params.set('bookId', selectedBookId);
    } else if (targetType === 'chapter' && selectedChapterId) {
      params.set('chapterId', selectedChapterId);
    } else if (targetType === 'quest' && selectedQuestId) {
      params.set('questId', selectedQuestId);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/admin/documents${newUrl}`, { scroll: false });
  }, [targetType, selectedBookId, selectedChapterId, selectedQuestId, router]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'faq',
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', contentType: 'faq' });
    setEditingDoc(null);
  };

  // 現在選択されているターゲットのIDを取得
  const getCurrentTargetId = () => {
    if (targetType === 'book') return selectedBookId ? parseInt(selectedBookId) : null;
    if (targetType === 'chapter') return selectedChapterId ? parseInt(selectedChapterId) : null;
    if (targetType === 'quest') return selectedQuestId ? parseInt(selectedQuestId) : null;
    return null;
  };

  const handleCreate = async () => {
    const targetId = getCurrentTargetId();
    if (!targetId) {
      alert('Please select a target first');
      return;
    }

    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        ...formData,
        generateEmbedding: true,
      };

      if (targetType === 'book') body.bookId = targetId;
      if (targetType === 'chapter') body.chapterId = targetId;
      if (targetType === 'quest') body.questId = targetId;

      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        mutate(`/api/admin/documents?${filterParam}`);
        mutate('/api/admin/documents');
        setDialogOpen(false);
        resetForm();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create document');
      }
    } catch {
      alert('Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDoc) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDoc.id,
          ...formData,
        }),
      });

      if (response.ok) {
        mutate(`/api/admin/documents?${filterParam}`);
        mutate('/api/admin/documents');
        setDialogOpen(false);
        resetForm();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update document');
      }
    } catch {
      alert('Failed to update document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/documents?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        mutate(`/api/admin/documents?${filterParam}`);
        mutate('/api/admin/documents');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete document');
      }
    } catch {
      alert('Failed to delete document');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRegenerateEmbedding = async (id: number) => {
    setIsRegenerating(id);
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'regenerate-embedding',
        }),
      });

      if (response.ok) {
        mutate(`/api/admin/documents?${filterParam}`);
        mutate('/api/admin/documents');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to regenerate embedding');
      }
    } catch {
      alert('Failed to regenerate embedding');
    } finally {
      setIsRegenerating(null);
    }
  };

  const openEditDialog = (doc: QuestDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: getEnglishText(doc.title as LocalizedText),
      content: getEnglishText(doc.content as LocalizedText),
      contentType: doc.contentType,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // ターゲット名を取得
  const getTargetName = (doc: QuestDocument) => {
    if (doc.bookId) {
      const book = booksData?.books.find(b => b.id === doc.bookId);
      return book ? `Book: ${getEnglishText(book.title as LocalizedText)}` : '-';
    }
    if (doc.chapterId) {
      const chapter = chaptersData?.chapters.find(c => c.id === doc.chapterId);
      return chapter ? `Chapter: ${getEnglishText(chapter.title as LocalizedText)}` : '-';
    }
    if (doc.questId) {
      const quest = questsData?.quests.find(q => q.id === doc.questId);
      return quest ? `Quest: ${getEnglishText(quest.title as LocalizedText)}` : '-';
    }
    return '-';
  };

  // ターゲットのバッジ色
  const getTargetBadge = (doc: QuestDocument) => {
    if (doc.bookId) return <Badge variant="default" className="bg-purple-500">Book</Badge>;
    if (doc.chapterId) return <Badge variant="default" className="bg-blue-500">Chapter</Badge>;
    if (doc.questId) return <Badge variant="default" className="bg-green-500">Quest</Badge>;
    return null;
  };

  const hasSelection = getCurrentTargetId() !== null;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
          Document Management
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filter Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* ターゲットタイプ選択 */}
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(value: TargetType) => {
                  setTargetType(value);
                  setSelectedBookId('');
                  setSelectedChapterId('');
                  setSelectedQuestId('');
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book">
                    <div className="flex items-center gap-2">
                      <Library className="h-4 w-4" />
                      Book
                    </div>
                  </SelectItem>
                  <SelectItem value="chapter">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Chapter
                    </div>
                  </SelectItem>
                  <SelectItem value="quest">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Quest
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ターゲット選択 */}
            <div className="space-y-2">
              <Label>Select {targetType.charAt(0).toUpperCase() + targetType.slice(1)}</Label>
              {targetType === 'book' && (
                <Select
                  value={selectedBookId || 'all'}
                  onValueChange={(value) => setSelectedBookId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a book" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    {booksData?.books.map((book) => (
                      <SelectItem key={book.id} value={String(book.id)}>
                        {getEnglishText(book.title as LocalizedText)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {targetType === 'chapter' && (
                <Select
                  value={selectedChapterId || 'all'}
                  onValueChange={(value) => setSelectedChapterId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chapters</SelectItem>
                    {chaptersData?.chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={String(chapter.id)}>
                        {getEnglishText(chapter.title as LocalizedText)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {targetType === 'quest' && (
                <Select
                  value={selectedQuestId || 'all'}
                  onValueChange={(value) => setSelectedQuestId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a quest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quests</SelectItem>
                    {questsData?.quests.map((quest) => (
                      <SelectItem key={quest.id} value={String(quest.id)}>
                        {getEnglishText(quest.title as LocalizedText)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={openCreateDialog}
                  disabled={!hasSelection}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingDoc ? 'Edit Document' : 'New Document'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Document title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contentType">Type</Label>
                    <Select
                      value={formData.contentType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Document content (Markdown supported)"
                      className="w-full min-h-[200px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={editingDoc ? handleUpdate : handleCreate}
                      disabled={isCreating || !formData.title || !formData.content}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : editingDoc ? (
                        'Save Changes'
                      ) : (
                        'Create Document'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Embedding</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docsData?.documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                docsData?.documents.map((doc) => {
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {getEnglishText(doc.title as LocalizedText)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getTargetBadge(doc)}
                          <span className="text-sm text-muted-foreground">
                            {getTargetName(doc)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.contentType}</Badge>
                      </TableCell>
                      <TableCell>
                        {doc.embedding ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerateEmbedding(doc.id)}
                            disabled={isRegenerating === doc.id}
                            title="Regenerate embedding"
                          >
                            {isRegenerating === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                disabled={isDeleting === doc.id}
                              >
                                {isDeleting === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Document
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{getEnglishText(doc.title as LocalizedText)}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
