import {
  getAdminUser,
  getToolsAdmin,
  createTool,
  getSettingDefinitionsAdmin,
} from '@/lib/admin/queries';
import { db } from '@/lib/db/drizzle';
import { quests } from '@/lib/db/schema';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ツール一覧、クエスト一覧、設定定義一覧を取得
  const [toolsList, questsList, settingsList] = await Promise.all([
    getToolsAdmin(),
    db.select({ id: quests.id, slug: quests.slug, title: quests.title }).from(quests).orderBy(quests.order),
    getSettingDefinitionsAdmin(),
  ]);

  return Response.json({
    tools: toolsList,
    quests: questsList,
    settings: settingsList,
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
    name,
    description,
    icon,
    category,
    externalUrl,
    internalPath,
    unlockConditions,
    isActive,
  } = body;

  // バリデーション
  if (!slug || !name) {
    return Response.json(
      { error: 'slug and name are required' },
      { status: 400 }
    );
  }

  try {
    const tool = await createTool({
      slug,
      name,
      description: description || null,
      icon: icon || null,
      category: category || null,
      externalUrl: externalUrl || null,
      internalPath: internalPath || null,
      unlockConditions: unlockConditions || null,
      isActive: isActive ?? true,
    });
    return Response.json({ success: true, tool });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tool';
    return Response.json({ error: message }, { status: 500 });
  }
}
