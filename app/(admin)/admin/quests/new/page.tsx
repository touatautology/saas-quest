'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Quest, Chapter, QuestVerificationConfig } from '@/lib/db/schema';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';
import { LocalizedInput, LocalizedValue } from '@/components/ui/localized-input';
import { Textarea } from '@/components/ui/textarea';

type ChapterWithId = Chapter & { id: number };

// ヘルパー: JSONB LocalizedTextから英語版を取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  return getLocalizedText(text, 'en');
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const VERIFICATION_TYPES = [
  { value: 'api_key', label: 'API Key' },
  { value: 'stripe_product', label: 'Stripe Product' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'server_status', label: 'Server Status' },
  { value: 'manual', label: 'Manual' },
];

const CATEGORIES = [
  { value: 'setup', label: 'Setup' },
  { value: 'automation', label: 'Automation' },
  { value: 'integration', label: 'Integration' },
  { value: 'advanced', label: 'Advanced' },
];

export default function NewQuestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: questsData } = useSWR<{ quests: Quest[] }>(
    '/api/admin/quests',
    fetcher
  );

  const { data: chaptersData } = useSWR<{ chapters: ChapterWithId[] }>(
    '/api/admin/chapters',
    fetcher
  );

  const [formData, setFormData] = useState({
    slug: '',
    title: { en: '', ja: '' } as LocalizedValue,
    description: { en: '', ja: '' } as LocalizedValue,
    category: 'setup',
    prerequisiteQuestId: '',
    verificationType: 'manual',
    chapterId: '',
    // server_status用: requiredFieldsを改行区切りテキストで管理
    requiredFields: '',
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
      // verificationConfig を構築
      let verificationConfig: QuestVerificationConfig | null = null;
      if (formData.verificationType === 'server_status' && formData.requiredFields.trim()) {
        verificationConfig = {
          requiredFields: formData.requiredFields
            .split('\n')
            .map(f => f.trim())
            .filter(f => f.length > 0),
        };
      }

      const response = await fetch('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: formData.slug,
          title: formData.title,
          description: formData.description.en ? formData.description : null,
          category: formData.category,
          verificationType: formData.verificationType,
          verificationConfig,
          prerequisiteQuestId: formData.prerequisiteQuestId
            ? parseInt(formData.prerequisiteQuestId)
            : null,
          chapterId: formData.chapterId ? parseInt(formData.chapterId) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/quests');
      } else {
        setError(data.error || 'Failed to create quest');
      }
    } catch {
      setError('Failed to create quest');
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
          New Quest
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Quest Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <LocalizedInput
              label="Title"
              value={formData.title}
              onChange={(title) => setFormData({ ...formData, title })}
              placeholder="Quest title"
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
                placeholder="quest-slug"
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
              placeholder="Quest description..."
              multiline
              rows={4}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationType">Verification Type</Label>
                <Select
                  value={formData.verificationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, verificationType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* server_status検証の設定 */}
            {formData.verificationType === 'server_status' && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <Label htmlFor="requiredFields">Required Fields</Label>
                <Textarea
                  id="requiredFields"
                  value={formData.requiredFields}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredFields: e.target.value })
                  }
                  placeholder="server&#10;stripe_configured&#10;database_connected"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Enter field names that must be true in the server response (one per line).
                  These fields will be checked when verifying the user&apos;s server status.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="prerequisiteQuestId">Prerequisite Quest</Label>
              <Select
                value={formData.prerequisiteQuestId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, prerequisiteQuestId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {questsData?.quests.map((quest) => (
                    <SelectItem key={quest.id} value={String(quest.id)}>
                      {getEnglishText(quest.title as LocalizedText)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chapterId">Chapter</Label>
              <Select
                value={formData.chapterId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, chapterId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Unassigned)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unassigned)</SelectItem>
                  {chaptersData?.chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={String(chapter.id)}>
                      {getEnglishText(chapter.title as LocalizedText)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign this quest to a chapter
              </p>
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
                    Creating...
                  </>
                ) : (
                  'Create Quest'
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
