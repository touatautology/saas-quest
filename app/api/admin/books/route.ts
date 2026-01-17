import { db } from '@/lib/db/drizzle';
import { books, chapters } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, asc, max } from 'drizzle-orm';

// ブック一覧を取得
export async function GET() {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allBooks = await db
    .select()
    .from(books)
    .orderBy(asc(books.order));

  return Response.json({ books: allBooks });
}

// ブックを作成
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
      .select({ maxOrder: max(books.order) })
      .from(books);
    const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [newBook] = await db
      .insert(books)
      .values({
        slug,
        title,
        description: description || null,
        order: nextOrder,
      })
      .returning();

    return Response.json({ book: newBook });
  } catch (error) {
    console.error('Failed to create book:', error);
    return Response.json({ error: 'Failed to create book' }, { status: 500 });
  }
}

// ブックを更新
export async function PUT(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, description, order } = body;

    if (!id) {
      return Response.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.slug) updateData.slug = body.slug;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;

    const [updatedBook] = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning();

    return Response.json({ book: updatedBook });
  } catch (error) {
    console.error('Failed to update book:', error);
    return Response.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

// ブックの一括更新（並べ替え）
export async function PATCH(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, bookIds } = body;

    if (action === 'reorder' && Array.isArray(bookIds)) {
      // 順序を更新
      for (let i = 0; i < bookIds.length; i++) {
        await db
          .update(books)
          .set({ order: i + 1 })
          .where(eq(books.id, bookIds[i]));
      }
      return Response.json({ success: true, message: 'Books reordered' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update books:', error);
    return Response.json({ error: 'Failed to update books' }, { status: 500 });
  }
}

// ブックを削除
export async function DELETE(request: Request) {
  const user = await getUser();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const bookId = parseInt(id);

    // このブックに属するチャプターのbookIdをnullにする
    await db
      .update(chapters)
      .set({ bookId: null })
      .where(eq(chapters.bookId, bookId));

    // ブックを削除
    await db.delete(books).where(eq(books.id, bookId));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete book:', error);
    return Response.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
