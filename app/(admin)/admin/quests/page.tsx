'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  CollisionDetection,
  DroppableContainer,
  getFirstCollision,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Trash2,
  Pencil,
  Plus,
  ChevronRight,
  ChevronDown,
  Library,
  BookOpen,
  FileText,
  List,
  GripVertical,
} from 'lucide-react';
import { Quest, Chapter, Book } from '@/lib/db/schema';
import { LocalizedText } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type QuestsResponse = { quests: Quest[] };
type ChaptersResponse = { chapters: Chapter[] };
type BooksResponse = { books: Book[] };

type DragItem = {
  id: string;
  type: 'book' | 'chapter' | 'quest';
  data: Book | Chapter | Quest;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 英語タイトルを取得
const getEnglishText = (text: LocalizedText | string | null | undefined): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.en || '';
};

function getVerificationBadgeVariant(type: string) {
  switch (type) {
    case 'api_key':
      return 'default';
    case 'stripe_product':
      return 'secondary';
    case 'webhook':
      return 'outline';
    default:
      return 'secondary';
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

// ドラッグ可能なQuestアイテム
function SortableQuestItem({
  quest,
  onDelete,
  isDeleting,
}: {
  quest: Quest;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `quest-${quest.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md group bg-card',
        isDragging && 'shadow-lg ring-2 ring-orange-500'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:bg-muted rounded p-1 touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <List className="h-4 w-4 text-green-600 flex-shrink-0" />
      <span className="font-medium flex-1 truncate">
        {getEnglishText(quest.title as LocalizedText)}
      </span>
      <Badge variant="outline" className="text-xs">
        {quest.category}
      </Badge>
      <Badge variant={getVerificationBadgeVariant(quest.verificationType)} className="text-xs">
        {quest.verificationType}
      </Badge>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/admin/quests/${quest.id}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <DeleteDialog
          title="Delete Quest"
          description={`Are you sure you want to delete "${getEnglishText(quest.title as LocalizedText)}"? This will also delete all associated documents and user progress.`}
          onDelete={() => onDelete(quest.id)}
          isDeleting={isDeleting}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </DeleteDialog>
      </div>
    </div>
  );
}

// Chapterのドロップゾーン（Questを受け入れる）
function ChapterDropZone({
  chapterId,
  children,
  isDraggingQuest,
}: {
  chapterId: number;
  children: React.ReactNode;
  isDraggingQuest: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `chapter-dropzone-${chapterId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'pl-10 pr-3 pb-2 space-y-1 transition-colors rounded-b-lg',
        // ドラッグ中は最小高さを大きくしてドロップしやすく
        isDraggingQuest ? 'min-h-[80px] bg-blue-50/50 border-2 border-dashed border-blue-200' : 'min-h-[40px]',
        isOver && 'bg-blue-100 ring-2 ring-blue-400 ring-inset border-blue-400'
      )}
    >
      {children}
      {isDraggingQuest && !isOver && (
        <p className="text-xs text-blue-500 text-center py-2">Drop quest here</p>
      )}
    </div>
  );
}

// ドラッグ可能なChapterアイテム
function SortableChapterItem({
  chapter,
  quests,
  onDeleteChapter,
  onDeleteQuest,
  isDeletingChapter,
  deletingQuestId,
  onQuestsReorder,
  isDraggingQuest,
}: {
  chapter: Chapter;
  quests: Quest[];
  onDeleteChapter: (id: number) => void;
  onDeleteQuest: (id: number) => void;
  isDeletingChapter: boolean;
  deletingQuestId: number | null;
  onQuestsReorder: (chapterId: number, questIds: number[]) => void;
  isDraggingQuest: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const chapterQuests = useMemo(
    () => quests.filter((q) => q.chapterId === chapter.id).sort((a, b) => a.order - b.order),
    [quests, chapter.id]
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `chapter-${chapter.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border rounded-lg mb-2 bg-card',
        isDragging && 'shadow-lg ring-2 ring-blue-500'
      )}
    >
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-t-lg">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-muted rounded p-1 touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="p-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <BookOpen className="h-4 w-4 text-blue-600" />
        <span className="font-medium flex-1">
          {getEnglishText(chapter.title as LocalizedText)}
        </span>
        <Badge variant="secondary" className="text-xs">
          {chapterQuests.length} quests
        </Badge>
        <div className="flex items-center gap-1">
          <Link href={`/admin/documents?chapterId=${chapter.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Documents">
              <FileText className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href={`/admin/chapters/${chapter.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <DeleteDialog
            title="Delete Chapter"
            description={`Are you sure you want to delete "${getEnglishText(chapter.title as LocalizedText)}"? Quests in this chapter will become unassigned.`}
            onDelete={() => onDeleteChapter(chapter.id)}
            isDeleting={isDeletingChapter}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </DeleteDialog>
          <Link href="/admin/quests/new">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Add Quest">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
      {/* ドラッグ中は閉じていてもドロップゾーンを表示 */}
      {(expanded || isDraggingQuest) && (
        <ChapterDropZone chapterId={chapter.id} isDraggingQuest={isDraggingQuest}>
          {chapterQuests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 pl-3">
              No quests in this chapter. Drag quests here to add them.
            </p>
          ) : (
            <SortableContext
              items={chapterQuests.map((q) => `quest-${q.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {chapterQuests.map((quest) => (
                <SortableQuestItem
                  key={quest.id}
                  quest={quest}
                  onDelete={onDeleteQuest}
                  isDeleting={deletingQuestId === quest.id}
                />
              ))}
            </SortableContext>
          )}
        </ChapterDropZone>
      )}
    </div>
  );
}

// Bookのドロップゾーン（Chapterを受け入れる）
function BookDropZone({
  bookId,
  children,
  isDraggingChapter,
}: {
  bookId: number;
  children: React.ReactNode;
  isDraggingChapter: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `book-dropzone-${bookId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'p-3 space-y-2 rounded-b-xl transition-colors',
        // ドラッグ中は最小高さを大きくしてドロップしやすく
        isDraggingChapter ? 'min-h-[100px] bg-purple-50/50 border-2 border-dashed border-purple-200' : 'min-h-[60px]',
        isOver && 'bg-purple-100 ring-2 ring-purple-400 ring-inset border-purple-400'
      )}
    >
      {children}
      {isDraggingChapter && !isOver && (
        <p className="text-xs text-purple-500 text-center py-2">Drop chapter here</p>
      )}
    </div>
  );
}

// ドラッグ可能なBookアイテム
function SortableBookItem({
  book,
  chapters,
  quests,
  onDeleteBook,
  onDeleteChapter,
  onDeleteQuest,
  isDeletingBook,
  deletingChapterId,
  deletingQuestId,
  onQuestsReorder,
  isDraggingChapter,
  isDraggingQuest,
}: {
  book: Book;
  chapters: Chapter[];
  quests: Quest[];
  onDeleteBook: (id: number) => void;
  onDeleteChapter: (id: number) => void;
  onDeleteQuest: (id: number) => void;
  isDeletingBook: boolean;
  deletingChapterId: number | null;
  deletingQuestId: number | null;
  onQuestsReorder: (chapterId: number, questIds: number[]) => void;
  isDraggingChapter: boolean;
  isDraggingQuest: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const bookChapters = useMemo(
    () => chapters.filter((c) => c.bookId === book.id).sort((a, b) => a.order - b.order),
    [chapters, book.id]
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `book-${book.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-2 rounded-xl mb-4 bg-card shadow-sm',
        isDragging && 'shadow-lg ring-2 ring-purple-500'
      )}
    >
      <div className="flex items-center gap-2 py-3 px-4 hover:bg-muted/50 rounded-t-xl border-b">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-muted rounded p-1 touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="p-1">
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <Library className="h-5 w-5 text-purple-600" />
        <span className="font-semibold text-lg flex-1">
          {getEnglishText(book.title as LocalizedText)}
        </span>
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          {bookChapters.length} chapters
        </Badge>
        <div className="flex items-center gap-1">
          <Link href={`/admin/documents?bookId=${book.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Documents">
              <FileText className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/admin/books/${book.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <DeleteDialog
            title="Delete Book"
            description={`Are you sure you want to delete "${getEnglishText(book.title as LocalizedText)}"? Chapters in this book will become unassigned.`}
            onDelete={() => onDeleteBook(book.id)}
            isDeleting={isDeletingBook}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DeleteDialog>
          <Link href="/admin/chapters/new">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Add Chapter">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      {/* ドラッグ中は閉じていてもドロップゾーンを表示 */}
      {(expanded || isDraggingChapter) && (
        <BookDropZone bookId={book.id} isDraggingChapter={isDraggingChapter}>
          {bookChapters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 pl-4">
              No chapters in this book. Drag chapters here to add them.
            </p>
          ) : (
            <SortableContext
              items={bookChapters.map((c) => `chapter-${c.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {bookChapters.map((chapter) => (
                <SortableChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  quests={quests}
                  onDeleteChapter={onDeleteChapter}
                  onDeleteQuest={onDeleteQuest}
                  isDeletingChapter={deletingChapterId === chapter.id}
                  deletingQuestId={deletingQuestId}
                  onQuestsReorder={onQuestsReorder}
                  isDraggingQuest={isDraggingQuest}
                />
              ))}
            </SortableContext>
          )}
        </BookDropZone>
      )}
    </div>
  );
}

// 未分類のChapter/Quest
function UnassignedSection({
  chapters,
  quests,
  onDeleteChapter,
  onDeleteQuest,
  deletingChapterId,
  deletingQuestId,
  onQuestsReorder,
  isDraggingQuest,
}: {
  chapters: Chapter[];
  quests: Quest[];
  onDeleteChapter: (id: number) => void;
  onDeleteQuest: (id: number) => void;
  deletingChapterId: number | null;
  deletingQuestId: number | null;
  onQuestsReorder: (chapterId: number, questIds: number[]) => void;
  isDraggingQuest: boolean;
}) {
  const [expandedChapters, setExpandedChapters] = useState(true);
  const [expandedQuests, setExpandedQuests] = useState(true);

  const unassignedChapters = useMemo(
    () => chapters.filter((c) => !c.bookId).sort((a, b) => a.order - b.order),
    [chapters]
  );
  const unassignedQuests = useMemo(
    () => quests.filter((q) => !q.chapterId).sort((a, b) => a.order - b.order),
    [quests]
  );

  if (unassignedChapters.length === 0 && unassignedQuests.length === 0) {
    return null;
  }

  return (
    <div className="border-2 border-dashed rounded-xl mb-4 bg-muted/30">
      <div className="py-3 px-4 border-b border-dashed">
        <span className="font-semibold text-lg text-muted-foreground">Unassigned</span>
      </div>
      <div className="p-3 space-y-4">
        {/* 未分類のChapter */}
        {unassignedChapters.length > 0 && (
          <div>
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer"
              onClick={() => setExpandedChapters(!expandedChapters)}
            >
              {expandedChapters ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                Chapters without Book ({unassignedChapters.length})
              </span>
            </div>
            {expandedChapters && (
              <div className="space-y-2 pl-2">
                <SortableContext
                  items={unassignedChapters.map((c) => `chapter-${c.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {unassignedChapters.map((chapter) => (
                    <SortableChapterItem
                      key={chapter.id}
                      chapter={chapter}
                      quests={quests}
                      onDeleteChapter={onDeleteChapter}
                      onDeleteQuest={onDeleteQuest}
                      isDeletingChapter={deletingChapterId === chapter.id}
                      deletingQuestId={deletingQuestId}
                      onQuestsReorder={onQuestsReorder}
                      isDraggingQuest={isDraggingQuest}
                    />
                  ))}
                </SortableContext>
              </div>
            )}
          </div>
        )}

        {/* 未分類のQuest */}
        {unassignedQuests.length > 0 && (
          <div>
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer"
              onClick={() => setExpandedQuests(!expandedQuests)}
            >
              {expandedQuests ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                Quests without Chapter ({unassignedQuests.length})
              </span>
            </div>
            {expandedQuests && (
              <div className="space-y-1 pl-6">
                <SortableContext
                  items={unassignedQuests.map((q) => `quest-${q.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {unassignedQuests.map((quest) => (
                    <SortableQuestItem
                      key={quest.id}
                      quest={quest}
                      onDelete={onDeleteQuest}
                      isDeleting={deletingQuestId === quest.id}
                    />
                  ))}
                </SortableContext>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ドラッグオーバーレイ用コンポーネント
function DragOverlayItem({ item }: { item: DragItem | null }) {
  if (!item) return null;

  const getTitle = () => {
    if (item.type === 'book') {
      return getEnglishText((item.data as Book).title as LocalizedText);
    }
    if (item.type === 'chapter') {
      return getEnglishText((item.data as Chapter).title as LocalizedText);
    }
    return getEnglishText((item.data as Quest).title as LocalizedText);
  };

  const Icon = item.type === 'book' ? Library : item.type === 'chapter' ? BookOpen : List;
  const color = item.type === 'book' ? 'text-purple-600' : item.type === 'chapter' ? 'text-blue-600' : 'text-green-600';

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-white rounded-lg shadow-xl border-2 border-orange-500">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <Icon className={cn('h-4 w-4', color)} />
      <span className="font-medium">{getTitle()}</span>
    </div>
  );
}

export default function QuestsPage() {
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null);
  const [deletingChapterId, setDeletingChapterId] = useState<number | null>(null);
  const [deletingQuestId, setDeletingQuestId] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);

  const { data: booksData, isLoading: booksLoading } = useSWR<BooksResponse>(
    '/api/admin/books',
    fetcher
  );
  const { data: chaptersData, isLoading: chaptersLoading } = useSWR<ChaptersResponse>(
    '/api/admin/chapters',
    fetcher
  );
  const { data: questsData, isLoading: questsLoading } = useSWR<QuestsResponse>(
    '/api/admin/quests',
    fetcher
  );

  const isLoading = booksLoading || chaptersLoading || questsLoading;

  // ドラッグ中のアイテムタイプを判定
  const isDraggingChapter = activeItem?.type === 'chapter';
  const isDraggingQuest = activeItem?.type === 'quest';

  // カスタム衝突検出: ドロップゾーンを優先
  const customCollisionDetection: CollisionDetection = (args) => {
    // まず pointerWithin でポインタが入っているエリアを検出
    const pointerCollisions = pointerWithin(args);

    // ドロップゾーンを優先
    const dropzoneCollision = pointerCollisions.find(
      (collision) =>
        String(collision.id).startsWith('book-dropzone-') ||
        String(collision.id).startsWith('chapter-dropzone-')
    );

    if (dropzoneCollision) {
      return [dropzoneCollision];
    }

    // ドロップゾーンがなければ、rectIntersection で通常のソート用衝突検出
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return rectIntersection(args);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    const [type, numId] = id.split('-');
    const numericId = parseInt(numId);

    if (type === 'book') {
      const book = booksData?.books.find((b) => b.id === numericId);
      if (book) setActiveItem({ id, type: 'book', data: book });
    } else if (type === 'chapter') {
      const chapter = chaptersData?.chapters.find((c) => c.id === numericId);
      if (chapter) setActiveItem({ id, type: 'chapter', data: chapter });
    } else if (type === 'quest') {
      const quest = questsData?.quests.find((q) => q.id === numericId);
      if (quest) setActiveItem({ id, type: 'quest', data: quest });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const [activeType, activeNumId] = activeId.split('-');
    const [overType, overNumId] = overId.split('-');

    // Book並べ替え
    if (activeType === 'book' && overType === 'book') {
      const books = booksData?.books || [];
      const sortedBooks = [...books].sort((a, b) => a.order - b.order);
      const oldIndex = sortedBooks.findIndex((b) => b.id === parseInt(activeNumId));
      const newIndex = sortedBooks.findIndex((b) => b.id === parseInt(overNumId));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedBooks, oldIndex, newIndex);
        await fetch('/api/admin/books', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reorder',
            bookIds: newOrder.map((b) => b.id),
          }),
        });
        mutate('/api/admin/books');
      }
    }

    // Chapter並べ替えまたは別Bookへ移動
    if (activeType === 'chapter' && overType === 'chapter') {
      const chapters = chaptersData?.chapters || [];
      const activeChapter = chapters.find((c) => c.id === parseInt(activeNumId));
      const overChapter = chapters.find((c) => c.id === parseInt(overNumId));

      if (activeChapter && overChapter) {
        // 同じBook内での並べ替え
        if (activeChapter.bookId === overChapter.bookId) {
          const siblingChapters = chapters
            .filter((c) => c.bookId === activeChapter.bookId)
            .sort((a, b) => a.order - b.order);
          const oldIndex = siblingChapters.findIndex((c) => c.id === activeChapter.id);
          const newIndex = siblingChapters.findIndex((c) => c.id === overChapter.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(siblingChapters, oldIndex, newIndex);
            await fetch('/api/admin/chapters', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reorder',
                chapterIds: newOrder.map((c) => c.id),
              }),
            });
            mutate('/api/admin/chapters');
          }
        } else {
          // 別のBookへ移動（ドロップ先Chapterと同じBookに移動）
          await fetch('/api/admin/chapters', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move',
              chapterId: activeChapter.id,
              bookId: overChapter.bookId,
            }),
          });
          mutate('/api/admin/chapters');
        }
      }
    }

    // ChapterをBookに移動（book-XXXまたはbook-dropzone-XXXへのドロップ）
    if (activeType === 'chapter' && (overType === 'book' || overId.startsWith('book-dropzone-'))) {
      let targetBookId: number;
      if (overId.startsWith('book-dropzone-')) {
        targetBookId = parseInt(overId.replace('book-dropzone-', ''));
      } else {
        targetBookId = parseInt(overNumId);
      }
      await fetch('/api/admin/chapters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          chapterId: parseInt(activeNumId),
          bookId: targetBookId,
        }),
      });
      mutate('/api/admin/chapters');
    }

    // Quest並べ替えまたは別Chapterへ移動
    if (activeType === 'quest' && overType === 'quest') {
      const quests = questsData?.quests || [];
      const activeQuest = quests.find((q) => q.id === parseInt(activeNumId));
      const overQuest = quests.find((q) => q.id === parseInt(overNumId));

      if (activeQuest && overQuest) {
        // 同じChapter内での並べ替え
        if (activeQuest.chapterId === overQuest.chapterId) {
          const siblingQuests = quests
            .filter((q) => q.chapterId === activeQuest.chapterId)
            .sort((a, b) => a.order - b.order);
          const oldIndex = siblingQuests.findIndex((q) => q.id === activeQuest.id);
          const newIndex = siblingQuests.findIndex((q) => q.id === overQuest.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(siblingQuests, oldIndex, newIndex);
            await fetch('/api/admin/quests', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'reorder',
                questIds: newOrder.map((q) => q.id),
              }),
            });
            mutate('/api/admin/quests');
          }
        } else {
          // 別のChapterへ移動（ドロップ先Questと同じChapterに移動）
          await fetch('/api/admin/quests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move',
              questId: activeQuest.id,
              chapterId: overQuest.chapterId,
            }),
          });
          mutate('/api/admin/quests');
        }
      }
    }

    // QuestをChapterに移動（chapter-XXXまたはchapter-dropzone-XXXへのドロップ）
    if (activeType === 'quest' && (overType === 'chapter' || overId.startsWith('chapter-dropzone-'))) {
      let targetChapterId: number;
      if (overId.startsWith('chapter-dropzone-')) {
        targetChapterId = parseInt(overId.replace('chapter-dropzone-', ''));
      } else {
        targetChapterId = parseInt(overNumId);
      }
      await fetch('/api/admin/quests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          questId: parseInt(activeNumId),
          chapterId: targetChapterId,
        }),
      });
      mutate('/api/admin/quests');
    }
  };

  const handleDeleteBook = async (id: number) => {
    setDeletingBookId(id);
    try {
      const response = await fetch(`/api/admin/books?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        mutate('/api/admin/books');
        mutate('/api/admin/chapters');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete book');
      }
    } catch {
      alert('Failed to delete book');
    } finally {
      setDeletingBookId(null);
    }
  };

  const handleDeleteChapter = async (id: number) => {
    setDeletingChapterId(id);
    try {
      const response = await fetch(`/api/admin/chapters?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        mutate('/api/admin/chapters');
        mutate('/api/admin/quests');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete chapter');
      }
    } catch {
      alert('Failed to delete chapter');
    } finally {
      setDeletingChapterId(null);
    }
  };

  const handleDeleteQuest = async (id: number) => {
    setDeletingQuestId(id);
    try {
      const response = await fetch(`/api/admin/quests?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        mutate('/api/admin/quests');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete quest');
      }
    } catch {
      alert('Failed to delete quest');
    } finally {
      setDeletingQuestId(null);
    }
  };

  const handleQuestsReorder = async (chapterId: number, questIds: number[]) => {
    await fetch('/api/admin/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        questIds,
      }),
    });
    mutate('/api/admin/quests');
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

  const books = (booksData?.books || []).sort((a, b) => a.order - b.order);
  const chapters = chaptersData?.chapters || [];
  const quests = questsData?.quests || [];

  // 統計
  const totalBooks = books.length;
  const totalChapters = chapters.length;
  const totalQuests = quests.length;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
            Content Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalBooks} books · {totalChapters} chapters · {totalQuests} quests
            <span className="ml-2 text-xs">(Drag to reorder or move items)</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/books/new">
            <Button variant="outline" className="gap-2">
              <Library className="h-4 w-4" />
              New Book
            </Button>
          </Link>
          <Link href="/admin/chapters/new">
            <Button variant="outline" className="gap-2">
              <BookOpen className="h-4 w-4" />
              New Chapter
            </Button>
          </Link>
          <Link href="/admin/quests/new">
            <Button className="bg-orange-500 hover:bg-orange-600 gap-2">
              <Plus className="h-4 w-4" />
              New Quest
            </Button>
          </Link>
        </div>
      </div>

      {/* 階層ビュー with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          <SortableContext
            items={books.map((b) => `book-${b.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {books.map((book) => (
              <SortableBookItem
                key={book.id}
                book={book}
                chapters={chapters}
                quests={quests}
                onDeleteBook={handleDeleteBook}
                onDeleteChapter={handleDeleteChapter}
                onDeleteQuest={handleDeleteQuest}
                isDeletingBook={deletingBookId === book.id}
                deletingChapterId={deletingChapterId}
                deletingQuestId={deletingQuestId}
                onQuestsReorder={handleQuestsReorder}
                isDraggingChapter={isDraggingChapter}
                isDraggingQuest={isDraggingQuest}
              />
            ))}
          </SortableContext>

          {/* 未分類セクション */}
          <UnassignedSection
            chapters={chapters}
            quests={quests}
            onDeleteChapter={handleDeleteChapter}
            onDeleteQuest={handleDeleteQuest}
            deletingChapterId={deletingChapterId}
            deletingQuestId={deletingQuestId}
            onQuestsReorder={handleQuestsReorder}
            isDraggingQuest={isDraggingQuest}
          />

          {/* コンテンツがない場合 */}
          {books.length === 0 && chapters.length === 0 && quests.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No content yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by creating a Book, then add Chapters and Quests.
              </p>
              <Link href="/admin/books/new">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Create First Book
                </Button>
              </Link>
            </div>
          )}
        </div>

        <DragOverlay>
          <DragOverlayItem item={activeItem} />
        </DragOverlay>
      </DndContext>
    </section>
  );
}
