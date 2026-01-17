import { getAdminUser, getSettingDefinitionsAdmin, createSettingDefinition } from '@/lib/admin/queries';

// GET: 設定定義一覧を取得
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettingDefinitionsAdmin();
    return Response.json({ settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return Response.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// POST: 新規設定定義を作成
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // バリデーション
    if (!body.key || !body.name) {
      return Response.json(
        { error: 'Key and name are required' },
        { status: 400 }
      );
    }

    if (!body.valueType) {
      return Response.json(
        { error: 'Value type is required' },
        { status: 400 }
      );
    }

    const setting = await createSettingDefinition({
      key: body.key,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      valueType: body.valueType,
      isEncrypted: body.isEncrypted ?? false,
      isActive: body.isActive ?? true,
    });

    return Response.json({ success: true, setting });
  } catch (error) {
    console.error('Failed to create setting:', error);
    // 重複キーエラーの場合
    if (error instanceof Error && error.message.includes('unique')) {
      return Response.json(
        { error: 'Setting key already exists' },
        { status: 400 }
      );
    }
    return Response.json({ error: 'Failed to create setting' }, { status: 500 });
  }
}
