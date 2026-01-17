import {
  getAdminUser,
  getQuestsAdmin,
  createQuest,
  updateQuest,
  deleteQuest,
  reorderQuests,
} from '@/lib/admin/queries';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quests = await getQuestsAdmin();
  return Response.json({ quests });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, title, description, category, prerequisiteQuestId, verificationType, verificationConfig, chapterId } = body;

  if (!slug || !title || !category || !verificationType) {
    return Response.json(
      { error: 'slug, title, category, and verificationType are required' },
      { status: 400 }
    );
  }

  try {
    const quest = await createQuest({
      slug,
      title,
      description,
      category,
      prerequisiteQuestId: prerequisiteQuestId || undefined,
      verificationType,
      verificationConfig: verificationConfig || null,
      chapterId: chapterId || null,
    });
    return Response.json({ success: true, quest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create quest';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, action, ...data } = body;

  // 順序変更の場合
  if (action === 'reorder' && data.questIds) {
    await reorderQuests(data.questIds);
    return Response.json({ success: true, message: 'Quests reordered successfully' });
  }

  // 親チャプター変更の場合
  if (action === 'move' && data.questId) {
    await updateQuest(data.questId, { chapterId: data.chapterId || null });
    return Response.json({ success: true, message: 'Quest moved successfully' });
  }

  // 通常の更新
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  await updateQuest(id, data);
  return Response.json({ success: true, message: 'Quest updated successfully' });
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteQuest(parseInt(id));
  return Response.json({ success: true, message: 'Quest deleted successfully' });
}
