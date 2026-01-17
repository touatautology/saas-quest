import { getAdminUser, updateSettingDefinition, deleteSettingDefinition } from '@/lib/admin/queries';

// PUT: 設定定義を更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const settingId = parseInt(id, 10);
    if (isNaN(settingId)) {
      return Response.json({ error: 'Invalid setting ID' }, { status: 400 });
    }

    const body = await request.json();
    await updateSettingDefinition(settingId, body);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to update setting:', error);
    return Response.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}

// DELETE: 設定定義を削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const settingId = parseInt(id, 10);
    if (isNaN(settingId)) {
      return Response.json({ error: 'Invalid setting ID' }, { status: 400 });
    }

    await deleteSettingDefinition(settingId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete setting:', error);
    return Response.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
}
