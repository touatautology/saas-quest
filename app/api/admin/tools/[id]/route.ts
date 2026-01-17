import {
  getAdminUser,
  updateTool,
  deleteTool,
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
  const toolId = parseInt(id);
  if (isNaN(toolId)) {
    return Response.json({ error: 'Invalid tool ID' }, { status: 400 });
  }

  const body = await request.json();

  try {
    await updateTool(toolId, body);
    return Response.json({ success: true, message: 'Tool updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update tool';
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
  const toolId = parseInt(id);
  if (isNaN(toolId)) {
    return Response.json({ error: 'Invalid tool ID' }, { status: 400 });
  }

  try {
    await deleteTool(toolId);
    return Response.json({ success: true, message: 'Tool deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete tool';
    return Response.json({ error: message }, { status: 500 });
  }
}
