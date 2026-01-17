import { db } from './drizzle';
import { tools, ToolUnlockCondition } from './schema';

type ToolSeed = {
  slug: string;
  name: { en: string; ja: string };
  description: { en: string; ja: string };
  icon: string;
  category: string;
  externalUrl: string | null;
  internalPath: string | null;
  unlockConditions: ToolUnlockCondition;
  order: number;
};

const toolsData: ToolSeed[] = [
  {
    slug: 'stripe',
    name: {
      en: 'Stripe',
      ja: 'Stripe',
    },
    description: {
      en: 'Payment processing platform',
      ja: '決済プラットフォーム',
    },
    icon: 'CreditCard',
    category: 'payment',
    externalUrl: 'https://dashboard.stripe.com',
    internalPath: null,
    unlockConditions: {
      quests: ['stripe-account'],
    },
    order: 1,
  },
  {
    slug: 'n8n',
    name: {
      en: 'n8n',
      ja: 'n8n',
    },
    description: {
      en: 'Workflow automation platform',
      ja: 'ワークフロー自動化プラットフォーム',
    },
    icon: 'Workflow',
    category: 'automation',
    externalUrl: 'https://app.n8n.cloud',
    internalPath: null,
    unlockConditions: {
      quests: ['n8n-setup'],
    },
    order: 2,
  },
  {
    slug: 'user-server',
    name: {
      en: 'Your Server',
      ja: 'マイサーバー',
    },
    description: {
      en: 'Your deployed SaaS server',
      ja: 'デプロイ済みのSaaSサーバー',
    },
    icon: 'Server',
    category: 'infrastructure',
    externalUrl: null,
    internalPath: '/dashboard/server-config',
    unlockConditions: {
      settings: ['serverUrl'],
    },
    order: 3,
  },
  {
    slug: 'gemini-ai',
    name: {
      en: 'Gemini AI',
      ja: 'Gemini AI',
    },
    description: {
      en: 'Google AI assistant for quest help',
      ja: 'クエストのヘルプ用Google AIアシスタント',
    },
    icon: 'Sparkles',
    category: 'ai',
    externalUrl: 'https://aistudio.google.com',
    internalPath: null,
    unlockConditions: {
      settings: ['geminiApiKey'],
    },
    order: 4,
  },
];

async function seedTools() {
  console.log('Seeding tools...');

  for (const tool of toolsData) {
    // Check if tool already exists
    const existing = await db.query.tools.findFirst({
      where: (t, { eq }) => eq(t.slug, tool.slug),
    });

    if (existing) {
      console.log(`Tool "${tool.slug}" already exists, skipping...`);
      continue;
    }

    await db.insert(tools).values({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      category: tool.category,
      externalUrl: tool.externalUrl,
      internalPath: tool.internalPath,
      unlockConditions: tool.unlockConditions,
      order: tool.order,
      isActive: true,
    });

    console.log(`Created tool: ${tool.slug}`);
  }

  console.log('Tools seeding complete!');
}

seedTools()
  .catch(console.error)
  .finally(() => process.exit());
