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
  Cog,
  Key,
  Link,
  ToggleLeft,
  Type,
  Lock,
} from 'lucide-react';
import { SettingDefinition } from '@/lib/db/schema';
import { LocalizedText } from '@/lib/i18n';

type SettingsResponse = {
  settings: SettingDefinition[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 英語テキストを取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.en || '';
};

// 値タイプのアイコンマップ
const valueTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  string: Type,
  boolean: ToggleLeft,
  apiKey: Key,
  url: Link,
};

// 利用可能な値タイプ
const valueTypes = ['string', 'boolean', 'apiKey', 'url'];

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

// 設定編集/作成ダイアログ
function SettingDialog({
  open,
  onOpenChange,
  setting,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting: SettingDefinition | null;
  onSave: (data: Partial<SettingDefinition>) => void;
  isSaving: boolean;
}) {
  const [key, setKey] = useState(setting?.key || '');
  const [nameEn, setNameEn] = useState(getEnglishText(setting?.name as LocalizedText));
  const [descriptionEn, setDescriptionEn] = useState(
    getEnglishText(setting?.description as LocalizedText)
  );
  const [category, setCategory] = useState(setting?.category || '');
  const [valueType, setValueType] = useState(setting?.valueType || 'string');
  const [isEncrypted, setIsEncrypted] = useState(setting?.isEncrypted ?? false);
  const [isActive, setIsActive] = useState(setting?.isActive ?? true);

  const handleSave = () => {
    onSave({
      key,
      name: { en: nameEn },
      description: descriptionEn ? { en: descriptionEn } : null,
      category: category || null,
      valueType,
      isEncrypted,
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{setting ? 'Edit Setting' : 'New Setting'}</DialogTitle>
          <DialogDescription>
            {setting
              ? 'Update the setting definition'
              : 'Create a new setting that can be used as an unlock condition'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="key">Key (unique identifier)</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="geminiApiKey"
              disabled={!!setting}
            />
            {setting && (
              <p className="text-xs text-muted-foreground">Key cannot be changed after creation</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (English)</Label>
            <Input
              id="name"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Gemini API Key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (English)</Label>
            <Textarea
              id="description"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="API key for Google Gemini AI"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ai, server, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valueType">Value Type</Label>
              <Select value={valueType} onValueChange={setValueType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {valueTypes.map((type) => {
                    const IconComp = valueTypeIcons[type] || Type;
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" /> {type}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch id="isEncrypted" checked={isEncrypted} onCheckedChange={setIsEncrypted} />
              <Label htmlFor="isEncrypted" className="flex items-center gap-1">
                <Lock className="h-4 w-4" /> Encrypted
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !key || !nameEn || !valueType}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {setting ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 設定カード
function SettingCard({
  setting,
  onEdit,
  onDelete,
  isDeleting,
}: {
  setting: SettingDefinition;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const IconComponent = valueTypeIcons[setting.valueType] || Type;

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
        !setting.isActive ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{getEnglishText(setting.name as LocalizedText)}</h3>
            <p className="text-xs text-muted-foreground font-mono">{setting.key}</p>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {getEnglishText(setting.description as LocalizedText) || 'No description'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {setting.category && (
                <Badge variant="outline" className="text-xs">
                  {setting.category}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {setting.valueType}
              </Badge>
              {setting.isEncrypted && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Encrypted
                </Badge>
              )}
              {!setting.isActive && (
                <Badge variant="destructive" className="text-xs">
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
            title="Delete Setting"
            description={`Are you sure you want to delete "${getEnglishText(setting.name as LocalizedText)}"? This may affect tools that use this setting as an unlock condition.`}
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

export default function SettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SettingDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useSWR<SettingsResponse>('/api/admin/settings', fetcher);

  const handleOpenNew = () => {
    setEditingSetting(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (setting: SettingDefinition) => {
    setEditingSetting(setting);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<SettingDefinition>) => {
    setIsSaving(true);
    try {
      if (editingSetting) {
        // Update
        const response = await fetch(`/api/admin/settings/${editingSetting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update setting');
        }
      } else {
        // Create
        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create setting');
        }
      }
      mutate('/api/admin/settings');
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
      const response = await fetch(`/api/admin/settings/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete setting');
      }
      mutate('/api/admin/settings');
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

  const settings = data?.settings || [];

  // カテゴリ別にグループ化
  const settingsByCategory = settings.reduce((acc, setting) => {
    const cat = setting.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(setting);
    return acc;
  }, {} as Record<string, SettingDefinition[]>);

  const categories = Object.keys(settingsByCategory).sort();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">Settings Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {settings.length} setting(s) · {settings.filter((s) => s.isActive).length} active ·{' '}
            {settings.filter((s) => s.isEncrypted).length} encrypted
          </p>
        </div>
        <Button onClick={handleOpenNew} className="bg-blue-500 hover:bg-blue-600 gap-2">
          <Plus className="h-4 w-4" />
          New Setting
        </Button>
      </div>

      {/* Settings by category */}
      {categories.map((category) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-medium flex items-center gap-2 mb-3 capitalize">
            <Cog className="h-5 w-5 text-purple-500" />
            {category}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {settingsByCategory[category].map((setting) => (
              <SettingCard
                key={setting.id}
                setting={setting}
                onEdit={() => handleEdit(setting)}
                onDelete={() => handleDelete(setting.id)}
                isDeleting={deletingId === setting.id}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {settings.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <Cog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No settings defined</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create settings that can be used as unlock conditions for tools.
          </p>
          <Button onClick={handleOpenNew} className="bg-blue-500 hover:bg-blue-600">
            Create First Setting
          </Button>
        </div>
      )}

      {/* Dialog */}
      <SettingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        setting={editingSetting}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </section>
  );
}
