import {
  getAdminUser,
  updateReward,
  deleteReward,
} from '@/lib/admin/queries';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const rewardId = parseInt(id);
  if (isNaN(rewardId)) {
    return Response.json({ error: 'Invalid reward ID' }, { status: 400 });
  }

  const body = await request.json();

  try {
    await updateReward(rewardId, body);
    return Response.json({ success: true, message: 'Reward updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update reward';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const rewardId = parseInt(id);
  if (isNaN(rewardId)) {
    return Response.json({ error: 'Invalid reward ID' }, { status: 400 });
  }

  try {
    await deleteReward(rewardId);
    return Response.json({ success: true, message: 'Reward deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete reward';
    return Response.json({ error: message }, { status: 500 });
  }
}
