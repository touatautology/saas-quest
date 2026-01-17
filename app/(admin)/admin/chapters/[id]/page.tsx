'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Chapter, Book } from '@/lib/db/schema';
import { LocalizedText } from '@/lib/i18n';
import { LocalizedInput, LocalizedValue } from '@/components/ui/localized-input';

// ヘルパー: LocalizedTextをLocalizedValueに変換
const toLocalizedValue = (text: LocalizedText | string | null | undefined): LocalizedValue => {
  if (!text) return { en: '', ja: '' };
  if (typeof text === 'string') return { en: text, ja: '' };
  return {
    en: text.en || '',
    ja: text.ja || '',
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EditChapterPage() {
  const router = useRouter();
  const params = useParams();
  const chapterId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: chaptersData, isLoading } = useSWR<{ chapters: Chapter[] }>(
    '/api/admin/chapters',
    fetcher
  );

  const { data: booksData } = useSWR<{ books: Book[] }>(
    '/api/admin/books',
    fetcher
  );

  const currentChapter = chaptersData?.chapters.find(
    (c) => c.id === parseInt(chapterId)
  );

  const [formData, setFormData] = useState({
    slug: '',
    title: { en: '', ja: '' } as LocalizedValue,
    description: { en: '', ja: '' } as LocalizedValue,
    bookId: '' as string,
  });

  useEffect(() => {
    if (currentChapter) {
      setFormData({
        slug: currentChapter.slug,
        title: toLocalizedValue(currentChapter.title as LocalizedText),
        description: toLocalizedValue(currentChapter.description as LocalizedText),
        bookId: currentChapter.bookId ? String(currentChapter.bookId) : '',
      });
    }
  }, [currentChapter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.title.en) {
      setError('English title is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/chapters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(chapterId),
          slug: formData.slug,
          title: formData.title,
          description: formData.description.en ? formData.description : null,
          bookId: formData.bookId ? parseInt(formData.bookId) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/quests?tab=chapters');
      } else {
        setError(data.error || 'Failed to update chapter');
      }
    } catch {
      setError('Failed to update chapter');
    } finally {
      setIsSubmitting(false);
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

  if (!currentChapter) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="text-red-500">Chapter not found</div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/quests?tab=chapters">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
          Edit Chapter
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Chapter Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <LocalizedInput
              label="Title"
              value={formData.title}
              onChange={(title) => setFormData({ ...formData, title })}
              placeholder="Chapter title"
              required
            />

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="chapter-slug"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase, hyphens only)
              </p>
            </div>

            <LocalizedInput
              label="Description"
              value={formData.description}
              onChange={(description) => setFormData({ ...formData, description })}
              placeholder="Chapter description..."
              multiline
              rows={4}
            />

            <div className="space-y-2">
              <Label htmlFor="bookId">Book</Label>
              <Select
                value={formData.bookId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, bookId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a book" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Book</SelectItem>
                  {booksData?.books.map((book) => (
                    <SelectItem key={book.id} value={String(book.id)}>
                      {(book.title as LocalizedText)?.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Link href="/admin/quests?tab=chapters">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
