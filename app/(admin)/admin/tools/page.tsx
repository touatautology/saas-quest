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
  Wrench,
  CreditCard,
  Workflow,
  Server,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  Lock,
  Settings,
} from 'lucide-react';
import { Tool, ToolUnlockCondition, SettingDefinition } from '@/lib/db/schema';
import { LocalizedText } from '@/lib/i18n';

type ToolsResponse = {
  tools: Tool[];
  quests: { id: number; slug: string; title: LocalizedText }[];
  settings: SettingDefinition[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 英語タイトルを取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.en || '';
};

// アイコンマップ
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Workflow,
  Server,
  Wrench,
  Settings,
  Sparkles,
};

// アイコン名からコンポーネントを取得
function getIcon(iconName: string | null) {
  if (!iconName) return Wrench;
  return iconMap[iconName] || Wrench;
}

// 利用可能なアイコン一覧
const availableIcons = Object.keys(iconMap);

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

// ツール編集/作成ダイアログ
function ToolDialog({
  open,
  onOpenChange,
  tool,
  quests,
  settings,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool | null;
  quests: { id: number; slug: string; title: LocalizedText }[];
  settings: SettingDefinition[];
  onSave: (data: Partial<Tool> & { unlockConditions: ToolUnlockCondition | null }) => void;
  isSaving: boolean;
}) {
  const [slug, setSlug] = useState(tool?.slug || '');
  const [nameEn, setNameEn] = useState(getEnglishText(tool?.name as LocalizedText));
  const [descriptionEn, setDescriptionEn] = useState(
    getEnglishText(tool?.description as LocalizedText)
  );
  const [icon, setIcon] = useState(tool?.icon || 'Wrench');
  const [category, setCategory] = useState(tool?.category || '');
  const [externalUrl, setExternalUrl] = useState(tool?.externalUrl || '');
  const [internalPath, setInternalPath] = useState(tool?.internalPath || '');
  const [isActive, setIsActive] = useState(tool?.isActive ?? true);

  // アンロック条件
  const [selectedQuestSlugs, setSelectedQuestSlugs] = useState<string[]>(
    tool?.unlockConditions?.quests || []
  );
  const [selectedSettings, setSelectedSettings] = useState<string[]>(
    tool?.unlockConditions?.settings || []
  );

  const handleSave = () => {
    const unlockConditions: ToolUnlockCondition | null =
      selectedQuestSlugs.length > 0 || selectedSettings.length > 0
        ? {
            ...(selectedQuestSlugs.length > 0 ? { quests: selectedQuestSlugs } : {}),
            ...(selectedSettings.length > 0 ? { settings: selectedSettings } : {}),
          }
        : null;

    onSave({
      slug,
      name: { en: nameEn },
      description: descriptionEn ? { en: descriptionEn } : null,
      icon: icon || null,
      category: category || null,
      externalUrl: externalUrl || null,
      internalPath: internalPath || null,
      unlockConditions,
      isActive,
    });
  };

  const toggleQuest = (questSlug: string) => {
    setSelectedQuestSlugs((prev) =>
      prev.includes(questSlug) ? prev.filter((s) => s !== questSlug) : [...prev, questSlug]
    );
  };

  const toggleSetting = (settingKey: string) => {
    setSelectedSettings((prev) =>
      prev.includes(settingKey) ? prev.filter((s) => s !== settingKey) : [...prev, settingKey]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? 'Edit Tool' : 'New Tool'}</DialogTitle>
          <DialogDescription>
            {tool ? 'Update the tool details' : 'Create a new tool that users can unlock'}
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
                placeholder="stripe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map((iconName) => {
                    const IconComp = iconMap[iconName];
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" /> {iconName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (English)</Label>
            <Input
              id="name"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Stripe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (English)</Label>
            <Textarea
              id="description"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Payment processing platform"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="payment, automation, infrastructure..."
            />
          </div>

          {/* Links */}
          <div className="border-t pt-4 mt-2">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" /> Links
            </h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="externalUrl">External URL (opens in new tab)</Label>
                <Input
                  id="externalUrl"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://dashboard.stripe.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalPath">Internal Path (same tab)</Label>
                <Input
                  id="internalPath"
                  value={internalPath}
                  onChange={(e) => setInternalPath(e.target.value)}
                  placeholder="/dashboard/server-config"
                />
              </div>
            </div>
          </div>

          {/* Unlock Conditions */}
          <div className="border-t pt-4 mt-2">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Unlock Conditions
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Tool unlocks when ALL conditions are met (quests completed AND settings configured)
            </p>

            {/* Quest conditions */}
            <div className="space-y-3 mb-4">
              <Label>Required Quests (select quests to complete)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {quests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quests available</p>
                ) : (
                  <div className="space-y-1">
                    {quests.map((q) => (
                      <div
                        key={q.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                          selectedQuestSlugs.includes(q.slug) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => toggleQuest(q.slug)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuestSlugs.includes(q.slug)}
                          onChange={() => {}}
                          className="pointer-events-none"
                        />
                        <span className="text-sm">{getEnglishText(q.title)}</span>
                        <span className="text-xs text-muted-foreground">({q.slug})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedQuestSlugs.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedQuestSlugs.length} quest(s) selected
                </p>
              )}
            </div>

            {/* Settings conditions */}
            <div className="space-y-3">
              <Label>Required Settings (select settings to configure)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {settings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No settings available</p>
                ) : (
                  <div className="space-y-1">
                    {settings.filter(s => s.isActive).map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                          selectedSettings.includes(s.key) ? 'bg-purple-50 border border-purple-200' : ''
                        }`}
                        onClick={() => toggleSetting(s.key)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSettings.includes(s.key)}
                          onChange={() => {}}
                          className="pointer-events-none"
                        />
                        <span className="text-sm">{getEnglishText(s.name as LocalizedText)}</span>
                        <span className="text-xs text-muted-foreground">({s.key})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedSettings.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSettings.length} setting(s) selected
                </p>
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
            disabled={isSaving || !slug || !nameEn}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {tool ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ツールカード
function ToolCard({
  tool,
  onEdit,
  onDelete,
  isDeleting,
}: {
  tool: Tool;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const IconComponent = getIcon(tool.icon);
  const hasQuests = (tool.unlockConditions?.quests?.length ?? 0) > 0;
  const hasSettings = (tool.unlockConditions?.settings?.length ?? 0) > 0;

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
        !tool.isActive ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{getEnglishText(tool.name as LocalizedText)}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {getEnglishText(tool.description as LocalizedText) || 'No description'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {tool.category && (
                <Badge variant="outline" className="text-xs">
                  {tool.category}
                </Badge>
              )}
              {tool.externalUrl && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> External
                </Badge>
              )}
              {tool.internalPath && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" /> Internal
                </Badge>
              )}
              {!tool.isActive && (
                <Badge variant="destructive" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {(hasQuests || hasSettings) && (
              <div className="flex flex-wrap items-center gap-1 mt-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                {hasQuests && (
                  <span className="text-xs text-muted-foreground">
                    {tool.unlockConditions!.quests!.length} quest(s)
                  </span>
                )}
                {hasQuests && hasSettings && (
                  <span className="text-xs text-muted-foreground">+</span>
                )}
                {hasSettings && (
                  <span className="text-xs text-muted-foreground">
                    {tool.unlockConditions!.settings!.length} setting(s)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <DeleteDialog
            title="Delete Tool"
            description={`Are you sure you want to delete "${getEnglishText(tool.name as LocalizedText)}"?`}
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

export default function ToolsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useSWR<ToolsResponse>('/api/admin/tools', fetcher);

  const handleOpenNew = () => {
    setEditingTool(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<Tool> & { unlockConditions: ToolUnlockCondition | null }) => {
    setIsSaving(true);
    try {
      if (editingTool) {
        // Update
        const response = await fetch(`/api/admin/tools/${editingTool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update tool');
        }
      } else {
        // Create
        const response = await fetch('/api/admin/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create tool');
        }
      }
      mutate('/api/admin/tools');
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
      const response = await fetch(`/api/admin/tools/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete tool');
      }
      mutate('/api/admin/tools');
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

  const tools = data?.tools || [];
  const quests = data?.quests || [];
  const settings = data?.settings || [];

  // カテゴリ別にグループ化
  const toolsByCategory = tools.reduce((acc, tool) => {
    const cat = tool.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const categories = Object.keys(toolsByCategory).sort();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">Tools Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tools.length} tool(s) · {tools.filter((t) => t.isActive).length} active
          </p>
        </div>
        <Button onClick={handleOpenNew} className="bg-blue-500 hover:bg-blue-600 gap-2">
          <Plus className="h-4 w-4" />
          New Tool
        </Button>
      </div>

      {/* Tools by category */}
      {categories.map((category) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-medium flex items-center gap-2 mb-3 capitalize">
            <Wrench className="h-5 w-5 text-blue-500" />
            {category}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {toolsByCategory[category].map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onEdit={() => handleEdit(tool)}
                onDelete={() => handleDelete(tool.id)}
                isDeleting={deletingId === tool.id}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {tools.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tools yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create tools that users can unlock by completing quests or configuring settings.
          </p>
          <Button onClick={handleOpenNew} className="bg-blue-500 hover:bg-blue-600">
            Create First Tool
          </Button>
        </div>
      )}

      {/* Dialog */}
      <ToolDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tool={editingTool}
        quests={quests}
        settings={settings}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </section>
  );
}
