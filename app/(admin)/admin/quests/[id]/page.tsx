'use client';

import { useState } from 'react';
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
import { Quest, Chapter, QuestVerificationConfig } from '@/lib/db/schema';
import { getLocalizedText, LocalizedText } from '@/lib/i18n';
import { LocalizedInput, LocalizedValue } from '@/components/ui/localized-input';
import { Textarea } from '@/components/ui/textarea';

type ChapterWithId = Chapter & { id: number };
type QuestWithConfig = Quest & { verificationConfig?: QuestVerificationConfig | null };

// ヘルパー: JSONB LocalizedTextから英語版を取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  return getLocalizedText(text, 'en');
};

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

// フォームコンポーネント（データがロードされた後にマウントされる）
function QuestEditForm({
  quest,
  quests,
  chapters,
}: {
  quest: QuestWithConfig;
  quests: Quest[];
  chapters: ChapterWithId[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期値をクエストデータから設定
  const [formData, setFormData] = useState({
    slug: quest.slug,
    title: toLocalizedValue(quest.title as LocalizedText),
    description: toLocalizedValue(quest.description as LocalizedText),
    category: quest.category,
    prerequisiteQuestId: quest.prerequisiteQuestId
      ? String(quest.prerequisiteQuestId)
      : '',
    verificationType: quest.verificationType,
    chapterId: quest.chapterId ? String(quest.chapterId) : '',
    // server_status用: requiredFieldsを改行区切りテキストで管理
    requiredFields: quest.verificationConfig?.requiredFields?.join('\n') || '',
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quest.id,
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
        setError(data.error || 'Failed to update quest');
      }
    } catch {
      setError('Failed to update quest');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 前提クエストの選択肢から現在のクエストを除外
  const availablePrerequisites = quests.filter((q) => q.id !== quest.id);

  return (
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
            {availablePrerequisites.map((q) => (
              <SelectItem key={q.id} value={String(q.id)}>
                {getEnglishText(q.title as LocalizedText)}
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
            {chapters.map((chapter) => (
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
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        <Link href="/admin/quests">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}

export default function EditQuestPage() {
  const params = useParams();
  const questId = params.id as string;

  const { data: questsData, isLoading: questsLoading } = useSWR<{ quests: Quest[] }>(
    '/api/admin/quests',
    fetcher
  );

  const { data: chaptersData, isLoading: chaptersLoading } = useSWR<{ chapters: ChapterWithId[] }>(
    '/api/admin/chapters',
    fetcher
  );

  const isLoading = questsLoading || chaptersLoading;

  const currentQuest = questsData?.quests.find(
    (q) => q.id === parseInt(questId)
  );

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!currentQuest || !questsData || !chaptersData) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="text-red-500">Quest not found</div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/quests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
          Edit Quest
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Quest Details</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestEditForm
            quest={currentQuest}
            quests={questsData.quests}
            chapters={chaptersData.chapters}
          />
        </CardContent>
      </Card>
    </section>
  );
}
