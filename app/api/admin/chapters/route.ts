import { db } from '@/lib/db/drizzle';
import { chapters, quests } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, asc, max } from 'drizzle-orm';

// チャプター一覧を取得
export async function GET() {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allChapters = await db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.order));

  return Response.json({ chapters: allChapters });
}

// チャプターを作成
export async function POST(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, title, description } = body;

    if (!slug || !title?.en) {
      return Response.json({ error: 'Slug and English title are required' }, { status: 400 });
    }

    // 最大orderを取得
    const maxOrderResult = await db
      .select({ maxOrder: max(chapters.order) })
      .from(chapters);
    const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [newChapter] = await db
      .insert(chapters)
      .values({
        slug,
        title,
        description: description || null,
        order: nextOrder,
      })
      .returning();

    return Response.json({ chapter: newChapter });
  } catch (error) {
    console.error('Failed to create chapter:', error);
    return Response.json({ error: 'Failed to create chapter' }, { status: 500 });
  }
}

// チャプターを更新
export async function PUT(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, description, order } = body;

    if (!id) {
      return Response.json({ error: 'Chapter ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.slug) updateData.slug = body.slug;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (body.bookId !== undefined) updateData.bookId = body.bookId;

    const [updatedChapter] = await db
      .update(chapters)
      .set(updateData)
      .where(eq(chapters.id, id))
      .returning();

    return Response.json({ chapter: updatedChapter });
  } catch (error) {
    console.error('Failed to update chapter:', error);
    return Response.json({ error: 'Failed to update chapter' }, { status: 500 });
  }
}

// チャプターの一括更新（並べ替え、親変更）
export async function PATCH(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, chapterIds, chapterId, bookId } = body;

    // 順序変更
    if (action === 'reorder' && Array.isArray(chapterIds)) {
      for (let i = 0; i < chapterIds.length; i++) {
        await db
          .update(chapters)
          .set({ order: i + 1 })
          .where(eq(chapters.id, chapterIds[i]));
      }
      return Response.json({ success: true, message: 'Chapters reordered' });
    }

    // 親ブック変更
    if (action === 'move' && chapterId) {
      await db
        .update(chapters)
        .set({ bookId: bookId || null })
        .where(eq(chapters.id, chapterId));
      return Response.json({ success: true, message: 'Chapter moved' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update chapters:', error);
    return Response.json({ error: 'Failed to update chapters' }, { status: 500 });
  }
}

// チャプターを削除
export async function DELETE(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Chapter ID is required' }, { status: 400 });
    }

    const chapterId = parseInt(id);

    // このチャプターに属するクエストのchapterIdをnullにする
    await db
      .update(quests)
      .set({ chapterId: null })
      .where(eq(quests.chapterId, chapterId));

    // チャプターを削除
    await db.delete(chapters).where(eq(chapters.id, chapterId));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    return Response.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}
