'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Trash2,
  Pencil,
  Plus,
  Award,
  Coins,
  Gift,
  Trophy,
} from 'lucide-react';
import { Reward, RewardConditionConfig } from '@/lib/db/schema';
import { LocalizedText } from '@/lib/i18n';

type RewardsResponse = {
  rewards: Reward[];
  quests: { id: number; slug: string; title: LocalizedText }[];
  chapters: { id: number; slug: string; title: LocalizedText }[];
  books: { id: number; slug: string; title: LocalizedText }[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 英語タイトルを取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.en || '';
};

// リワードタイプのアイコン
function RewardTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'badge':
      return <Award className={className} />;
    case 'coin':
      return <Coins className={className} />;
    case 'perk':
      return <Gift className={className} />;
    default:
      return <Trophy className={className} />;
  }
}

// 削除確認ダイアログ
function DeleteDialog({
  title,
  description,
  onDelete,
  isDeleting,
  children,
}: {
  title: string;
  description: string;
  onDelete: () => void;
  isDeleting: boolean;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-red-500 hover:bg-red-600"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// リワード編集/作成ダイアログ
function RewardDialog({
  open,
  onOpenChange,
  reward,
  quests,
  chapters,
  books,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: Reward | null;
  quests: { id: number; slug: string; title: LocalizedText }[];
  chapters: { id: number; slug: string; title: LocalizedText }[];
  books: { id: number; slug: string; title: LocalizedText }[];
  onSave: (data: Partial<Reward> & { conditionConfig: RewardConditionConfig }) => void;
  isSaving: boolean;
}) {
  const [slug, setSlug] = useState(reward?.slug || '');
  const [titleEn, setTitleEn] = useState(getEnglishText(reward?.title as LocalizedText));
  const [descriptionEn, setDescriptionEn] = useState(
    getEnglishText(reward?.description as LocalizedText)
  );
  const [type, setType] = useState<'badge' | 'coin' | 'perk'>(
    (reward?.type as 'badge' | 'coin' | 'perk') || 'badge'
  );
  const [value, setValue] = useState(reward?.value?.toString() || '0');
  const [iconUrl, setIconUrl] = useState(reward?.iconUrl || '');
  const [conditionType, setConditionType] = useState<'quest' | 'chapter' | 'book' | 'custom'>(
    (reward?.conditionType as 'quest' | 'chapter' | 'book' | 'custom') || 'quest'
  );
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(
    reward?.conditionConfig?.type === 'quest' ? reward.conditionConfig.questId : null
  );
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    reward?.conditionConfig?.type === 'chapter' ? reward.conditionConfig.chapterId : null
  );
  const [selectedBookId, setSelectedBookId] = useState<number | null>(
    reward?.conditionConfig?.type === 'book' ? reward.conditionConfig.bookId : null
  );
  const [customQuestIds, setCustomQuestIds] = useState<number[]>(
    reward?.conditionConfig?.type === 'custom' ? reward.conditionConfig.questIds : []
  );
  const [requireAll, setRequireAll] = useState(
    reward?.conditionConfig?.type === 'custom' ? reward.conditionConfig.requireAll : true
  );
  const [isActive, setIsActive] = useState(reward?.isActive ?? true);

  const handleSave = () => {
    let conditionConfig: RewardConditionConfig;

    switch (conditionType) {
      case 'quest':
        if (!selectedQuestId) {
          alert('Please select a quest');
          return;
        }
        conditionConfig = { type: 'quest', questId: selectedQuestId };
        break;
      case 'chapter':
        if (!selectedChapterId) {
          alert('Please select a chapter');
          return;
        }
        conditionConfig = { type: 'chapter', chapterId: selectedChapterId };
        break;
      case 'book':
        if (!selectedBookId) {
          alert('Please select a book');
          return;
        }
        conditionConfig = { type: 'book', bookId: selectedBookId };
        break;
      case 'custom':
        if (customQuestIds.length === 0) {
          alert('Please select at least one quest');
          return;
        }
        conditionConfig = { type: 'custom', questIds: customQuestIds, requireAll };
        break;
    }

    onSave({
      slug,
      title: { en: titleEn },
      description: descriptionEn ? { en: descriptionEn } : null,
      type,
      value: parseInt(value) || 0,
      iconUrl: iconUrl || null,
      conditionType,
      conditionConfig,
      isActive,
    });
  };

  const toggleCustomQuest = (questId: number) => {
    setCustomQuestIds((prev) =>
      prev.includes(questId) ? prev.filter((id) => id !== questId) : [...prev, questId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reward ? 'Edit Reward' : 'New Reward'}</DialogTitle>
          <DialogDescription>
            {reward ? 'Update the reward details' : 'Create a new reward for users to earn'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="first-quest-badge"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'badge' | 'coin' | 'perk')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="badge">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" /> Badge
                    </div>
                  </SelectItem>
                  <SelectItem value="coin">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" /> Coin
                    </div>
                  </SelectItem>
                  <SelectItem value="perk">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" /> Perk
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title (English)</Label>
            <Input
              id="title"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="First Quest Badge"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (English)</Label>
            <Textarea
              id="description"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Awarded for completing your first quest"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {type === 'coin' && (
              <div className="space-y-2">
                <Label htmlFor="value">Coin Value</Label>
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="100"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="iconUrl">Icon URL (optional)</Label>
              <Input
                id="iconUrl"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Condition Settings */}
          <div className="border-t pt-4 mt-2">
            <h4 className="font-medium mb-3">Condition</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Condition Type</Label>
                <Select
                  value={conditionType}
                  onValueChange={(v) =>
                    setConditionType(v as 'quest' | 'chapter' | 'book' | 'custom')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quest">Complete Specific Quest</SelectItem>
                    <SelectItem value="chapter">Complete Chapter (All Quests)</SelectItem>
                    <SelectItem value="book">Complete Book (All Quests)</SelectItem>
                    <SelectItem value="custom">Custom (Multiple Quests)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {conditionType === 'quest' && (
                <div className="space-y-2">
                  <Label>Select Quest</Label>
                  <Select
                    value={selectedQuestId?.toString() || ''}
                    onValueChange={(v) => setSelectedQuestId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a quest..." />
                    </SelectTrigger>
                    <SelectContent>
                      {quests.map((q) => (
                        <SelectItem key={q.id} value={q.id.toString()}>
                          {getEnglishText(q.title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {conditionType === 'chapter' && (
                <div className="space-y-2">
                  <Label>Select Chapter</Label>
                  <Select
                    value={selectedChapterId?.toString() || ''}
                    onValueChange={(v) => setSelectedChapterId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a chapter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {getEnglishText(c.title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {conditionType === 'book' && (
                <div className="space-y-2">
                  <Label>Select Book</Label>
                  <Select
                    value={selectedBookId?.toString() || ''}
                    onValueChange={(v) => setSelectedBookId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a book..." />
                    </SelectTrigger>
                    <SelectContent>
                      {books.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {getEnglishText(b.title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {conditionType === 'custom' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="requireAll"
                      checked={requireAll}
                      onCheckedChange={setRequireAll}
                    />
                    <Label htmlFor="requireAll">
                      {requireAll ? 'Require ALL quests' : 'Require ANY quest'}
                    </Label>
                  </div>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Select Quests ({customQuestIds.length} selected)
                    </Label>
                    <div className="space-y-1">
                      {quests.map((q) => (
                        <div
                          key={q.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                            customQuestIds.includes(q.id) ? 'bg-orange-50 border border-orange-200' : ''
                          }`}
                          onClick={() => toggleCustomQuest(q.id)}
                        >
                          <input
                            type="checkbox"
                            checked={customQuestIds.includes(q.id)}
                            onChange={() => {}}
                            className="pointer-events-none"
                          />
                          <span className="text-sm">{getEnglishText(q.title)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2 pt-2">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !slug || !titleEn}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {reward ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// リワードカード
function RewardCard({
  reward,
  onEdit,
  onDelete,
  isDeleting,
}: {
  reward: Reward;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const getConditionLabel = () => {
    const config = reward.conditionConfig;
    switch (config.type) {
      case 'quest':
        return `Quest #${config.questId}`;
      case 'chapter':
        return `Chapter #${config.chapterId}`;
      case 'book':
        return `Book #${config.bookId}`;
      case 'custom':
        return `${config.questIds.length} quests (${config.requireAll ? 'all' : 'any'})`;
    }
  };

  const getTypeColor = () => {
    switch (reward.type) {
      case 'badge':
        return 'bg-amber-100 text-amber-800';
      case 'coin':
        return 'bg-yellow-100 text-yellow-800';
      case 'perk':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
        !reward.isActive ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor()}`}
          >
            <RewardTypeIcon type={reward.type} className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{getEnglishText(reward.title as LocalizedText)}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {getEnglishText(reward.description as LocalizedText) || 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {reward.conditionType}
              </Badge>
              <span className="text-xs text-muted-foreground">{getConditionLabel()}</span>
              {reward.type === 'coin' && reward.value && (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                  {reward.value} coins
                </Badge>
              )}
              {!reward.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <DeleteDialog
            title="Delete Reward"
            description={`Are you sure you want to delete "${getEnglishText(reward.title as LocalizedText)}"? This will also remove it from all users who earned it.`}
            onDelete={onDelete}
            isDeleting={isDeleting}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DeleteDialog>
        </div>
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useSWR<RewardsResponse>('/api/admin/rewards', fetcher);

  const handleOpenNew = () => {
    setEditingReward(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<Reward> & { conditionConfig: RewardConditionConfig }) => {
    setIsSaving(true);
    try {
      if (editingReward) {
        // Update
        const response = await fetch(`/api/admin/rewards/${editingReward.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update reward');
        }
      } else {
        // Create
        const response = await fetch('/api/admin/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create reward');
        }
      }
      mutate('/api/admin/rewards');
      setIsDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/rewards/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete reward');
      }
      mutate('/api/admin/rewards');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  const rewards = data?.rewards || [];
  const quests = data?.quests || [];
  const chapters = data?.chapters || [];
  const books = data?.books || [];

  // タイプ別にグループ化
  const badges = rewards.filter((r) => r.type === 'badge');
  const coins = rewards.filter((r) => r.type === 'coin');
  const perks = rewards.filter((r) => r.type === 'perk');

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">Rewards Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {badges.length} badges · {coins.length} coins · {perks.length} perks
          </p>
        </div>
        <Button onClick={handleOpenNew} className="bg-orange-500 hover:bg-orange-600 gap-2">
          <Plus className="h-4 w-4" />
          New Reward
        </Button>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-amber-500" />
            Badges
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {badges.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onEdit={() => handleEdit(reward)}
                onDelete={() => handleDelete(reward.id)}
                isDeleting={deletingId === reward.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Coins */}
      {coins.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium flex items-center gap-2 mb-3">
            <Coins className="h-5 w-5 text-yellow-500" />
            Coin Rewards
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {coins.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onEdit={() => handleEdit(reward)}
                onDelete={() => handleDelete(reward.id)}
                isDeleting={deletingId === reward.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Perks */}
      {perks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium flex items-center gap-2 mb-3">
            <Gift className="h-5 w-5 text-purple-500" />
            Perks
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {perks.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onEdit={() => handleEdit(reward)}
                onDelete={() => handleDelete(reward.id)}
                isDeleting={deletingId === reward.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {rewards.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No rewards yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create rewards to motivate users as they complete quests.
          </p>
          <Button onClick={handleOpenNew} className="bg-orange-500 hover:bg-orange-600">
            Create First Reward
          </Button>
        </div>
      )}

      {/* Dialog */}
      <RewardDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        reward={editingReward}
        quests={quests}
        chapters={chapters}
        books={books}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </section>
  );
}
