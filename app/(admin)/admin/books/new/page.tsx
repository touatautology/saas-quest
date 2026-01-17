'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { LocalizedInput, LocalizedValue } from '@/components/ui/localized-input';

export default function NewBookPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    slug: '',
    title: { en: '', ja: '' } as LocalizedValue,
    description: { en: '', ja: '' } as LocalizedValue,
  });

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
      const response = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: formData.slug,
          title: formData.title,
          description: formData.description.en ? formData.description : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/quests');
      } else {
        setError(data.error || 'Failed to create book');
      }
    } catch {
      setError('Failed to create book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/quests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
          New Book
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Book Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <LocalizedInput
              label="Title"
              value={formData.title}
              onChange={(title) => setFormData({ ...formData, title })}
              placeholder="Book title"
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
                placeholder="book-slug"
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
              placeholder="Book description..."
              multiline
              rows={4}
            />

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
                    Creating...
                  </>
                ) : (
                  'Create Book'
                )}
              </Button>
              <Link href="/admin/quests">
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
