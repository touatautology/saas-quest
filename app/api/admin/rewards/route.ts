import {
  getAdminUser,
  getRewardsAdmin,
  createReward,
} from '@/lib/admin/queries';
import { db } from '@/lib/db/drizzle';
import { quests, chapters, books } from '@/lib/db/schema';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // リワード一覧と条件選択用のデータを取得
  const [rewardsList, questsList, chaptersList, booksList] = await Promise.all([
    getRewardsAdmin(),
    db.select({ id: quests.id, slug: quests.slug, title: quests.title }).from(quests).orderBy(quests.order),
    db.select({ id: chapters.id, slug: chapters.slug, title: chapters.title }).from(chapters).orderBy(chapters.order),
    db.select({ id: books.id, slug: books.slug, title: books.title }).from(books).orderBy(books.order),
  ]);

  return Response.json({
    rewards: rewardsList,
    quests: questsList,
    chapters: chaptersList,
    books: booksList,
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    slug,
    title,
    description,
    type,
    value,
    iconUrl,
    conditionType,
    conditionConfig,
    isActive,
  } = body;

  // バリデーション
  if (!slug || !title || !type || !conditionType || !conditionConfig) {
    return Response.json(
      { error: 'slug, title, type, conditionType, and conditionConfig are required' },
      { status: 400 }
    );
  }

  // typeのバリデーション
  if (!['badge', 'coin', 'perk'].includes(type)) {
    return Response.json(
      { error: 'type must be one of: badge, coin, perk' },
      { status: 400 }
    );
  }

  // conditionTypeのバリデーション
  if (!['quest', 'chapter', 'book', 'custom'].includes(conditionType)) {
    return Response.json(
      { error: 'conditionType must be one of: quest, chapter, book, custom' },
      { status: 400 }
    );
  }

  try {
    const reward = await createReward({
      slug,
      title,
      description: description || null,
      type,
      value: value || 0,
      iconUrl: iconUrl || null,
      conditionType,
      conditionConfig,
      isActive: isActive ?? true,
    });
    return Response.json({ success: true, reward });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reward';
    return Response.json({ error: message }, { status: 500 });
  }
}
