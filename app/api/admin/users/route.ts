import { getAdminUser, getUsers, updateUserRole, softDeleteUser } from '@/lib/admin/queries';
import { UserRole } from '@/lib/db/schema';

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || undefined;

  const result = await getUsers(page, limit, search);
  return Response.json(result);
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return Response.json({ error: 'userId and role are required' }, { status: 400 });
  }

  // 自分自身のロールは変更できない
  if (userId === admin.id) {
    return Response.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const validRoles: UserRole[] = ['member', 'owner', 'admin'];
  if (!validRoles.includes(role)) {
    return Response.json({ error: 'Invalid role' }, { status: 400 });
  }

  await updateUserRole(userId, role);
  return Response.json({ success: true, message: 'Role updated successfully' });
}

export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 });
  }

  const userIdNum = parseInt(userId);

  // 自分自身は削除できない
  if (userIdNum === admin.id) {
    return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  await softDeleteUser(userIdNum);
  return Response.json({ success: true, message: 'User deleted successfully' });
}
