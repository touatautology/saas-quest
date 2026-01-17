import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  vector,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// ブック（本）テーブル - チャプターをグループ化
export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: jsonb('title').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  description: jsonb('description').$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string } | null>(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// チャプター（章）テーブル - クエストをグループ化
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: jsonb('title').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  description: jsonb('description').$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string } | null>(),
  bookId: integer('book_id').references(() => books.id),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// クエスト検証設定の型定義
export type QuestVerificationConfig = {
  // server_status用: チェックするフィールド名の配列
  requiredFields?: string[];
  // webhook用: テスト送信するペイロードのカスタマイズ
  webhookPayload?: Record<string, unknown>;
  // その他の将来の拡張用
  [key: string]: unknown;
};

// クエスト定義テーブル
// LocalizedText型：多言語対応のJSONB形式
// { en: '...', es?: '...', ja?: '...', zh?: '...', ko?: '...' }
export const quests = pgTable('quests', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: jsonb('title').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  description: jsonb('description').$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string } | null>(),
  chapterId: integer('chapter_id').references(() => chapters.id),
  order: integer('order').notNull().default(0),
  category: varchar('category', { length: 50 }).notNull(),
  prerequisiteQuestId: integer('prerequisite_quest_id'),
  verificationType: varchar('verification_type', { length: 50 }).notNull(),
  verificationConfig: jsonb('verification_config').$type<QuestVerificationConfig | null>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ユーザーのクエスト進捗テーブル
export const userQuestProgress = pgTable('user_quest_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  questId: integer('quest_id')
    .notNull()
    .references(() => quests.id),
  status: varchar('status', { length: 20 }).notNull().default('locked'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
});

// ユーザー設定テーブル（AIチャット用APIキーなど）
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  geminiApiKeyEncrypted: text('gemini_api_key_encrypted'),
  geminiModel: varchar('gemini_model', { length: 50 }).notNull().default('gemini-2.5-flash-lite'),
  aiChatEnabled: boolean('ai_chat_enabled').notNull().default(false),
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  // サーバー検証設定
  serverUrl: varchar('server_url', { length: 500 }),
  serverVerificationToken: text('server_verification_token'), // 暗号化して保存
  serverTokenCreatedAt: timestamp('server_token_created_at'),
  // ツール設定（動的、管理画面から追加可能）
  toolSettings: jsonb('tool_settings').$type<Record<string, string | boolean | number | null>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// クエストドキュメント（RAG用ナレッジベース）
// bookId, chapterId, questIdのいずれか1つ以上を設定可能
export const questDocuments = pgTable('quest_documents', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').references(() => books.id),
  chapterId: integer('chapter_id').references(() => chapters.id),
  questId: integer('quest_id').references(() => quests.id),
  title: jsonb('title').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  content: jsonb('content').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  contentType: varchar('content_type', { length: 50 }).notNull().default('faq'),
  embedding: vector('embedding', { dimensions: 768 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// チャットセッション
export const chatSessions = pgTable('chat_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  questId: integer('quest_id')
    .notNull()
    .references(() => quests.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// チャットメッセージ
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => chatSessions.id),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  sources: jsonb('sources'),
  feedback: varchar('feedback', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  questProgress: many(userQuestProgress),
  settings: one(userSettings),
  chatSessions: many(chatSessions),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const booksRelations = relations(books, ({ many }) => ({
  chapters: many(chapters),
  documents: many(questDocuments),
}));

export const chaptersRelations = relations(chapters, ({ many, one }) => ({
  quests: many(quests),
  documents: many(questDocuments),
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
}));

export const questsRelations = relations(quests, ({ many, one }) => ({
  userProgress: many(userQuestProgress),
  documents: many(questDocuments),
  chapter: one(chapters, {
    fields: [quests.chapterId],
    references: [chapters.id],
  }),
  prerequisiteQuest: one(quests, {
    fields: [quests.prerequisiteQuestId],
    references: [quests.id],
  }),
}));

export const userQuestProgressRelations = relations(userQuestProgress, ({ one }) => ({
  user: one(users, {
    fields: [userQuestProgress.userId],
    references: [users.id],
  }),
  quest: one(quests, {
    fields: [userQuestProgress.questId],
    references: [quests.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const questDocumentsRelations = relations(questDocuments, ({ one }) => ({
  book: one(books, {
    fields: [questDocuments.bookId],
    references: [books.id],
  }),
  chapter: one(chapters, {
    fields: [questDocuments.chapterId],
    references: [chapters.id],
  }),
  quest: one(quests, {
    fields: [questDocuments.questId],
    references: [quests.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  quest: one(quests, {
    fields: [chatSessions.questId],
    references: [quests.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// ツールのアンロック条件設定の型
export type ToolUnlockCondition = {
  // 完了必須クエストのslug配列（AND条件）
  quests?: string[];
  // 設定必須項目（userSettingsのキー名）
  settings?: string[];
};

// 設定定義テーブル（管理者が設定項目を管理）
export const settingDefinitions = pgTable('setting_definitions', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: jsonb('name').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  description: jsonb('description').$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string } | null>(),
  category: varchar('category', { length: 50 }),
  valueType: varchar('value_type', { length: 20 }).notNull(), // 'string' | 'boolean' | 'apiKey' | 'url'
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ツール定義テーブル
export const tools = pgTable('tools', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: jsonb('name').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  description: jsonb('description').$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string } | null>(),
  icon: varchar('icon', { length: 50 }), // Lucide icon name
  category: varchar('category', { length: 50 }),
  externalUrl: varchar('external_url', { length: 500 }),
  internalPath: varchar('internal_path', { length: 200 }),
  unlockConditions: jsonb('unlock_conditions').$type<ToolUnlockCondition>(),
  order: integer('order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// リワード条件設定の型
export type RewardConditionConfig =
  | { type: 'quest'; questId: number }
  | { type: 'chapter'; chapterId: number }
  | { type: 'book'; bookId: number }
  | { type: 'custom'; questIds: number[]; requireAll: boolean };

// リワード定義テーブル
export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: jsonb('title').notNull().$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string }>(),
  description: jsonb('description').$type<{ en: string; es?: string; ja?: string; zh?: string; ko?: string } | null>(),
  type: varchar('type', { length: 20 }).notNull(), // 'badge' | 'coin' | 'perk'
  value: integer('value').default(0), // コインの場合の獲得量
  iconUrl: varchar('icon_url', { length: 500 }),
  conditionType: varchar('condition_type', { length: 30 }).notNull(), // 'quest' | 'chapter' | 'book' | 'custom'
  conditionConfig: jsonb('condition_config').notNull().$type<RewardConditionConfig>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ユーザーのリワード獲得履歴
export const userRewards = pgTable('user_rewards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  rewardId: integer('reward_id')
    .notNull()
    .references(() => rewards.id),
  earnedAt: timestamp('earned_at').notNull().defaultNow(),
});

// ユーザーの通貨（コイン）残高
export const userCurrency = pgTable('user_currency', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  coins: integer('coins').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// リワード関連のリレーション
export const rewardsRelations = relations(rewards, ({ many }) => ({
  userRewards: many(userRewards),
}));

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, {
    fields: [userRewards.userId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [userRewards.rewardId],
    references: [rewards.id],
  }),
}));

export const userCurrencyRelations = relations(userCurrency, ({ one }) => ({
  user: one(users, {
    fields: [userCurrency.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;
export type UserQuestProgress = typeof userQuestProgress.$inferSelect;
export type NewUserQuestProgress = typeof userQuestProgress.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type QuestDocument = typeof questDocuments.$inferSelect;
export type NewQuestDocument = typeof questDocuments.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Reward = typeof rewards.$inferSelect;
export type NewReward = typeof rewards.$inferInsert;
export type UserReward = typeof userRewards.$inferSelect;
export type NewUserReward = typeof userRewards.$inferInsert;
export type UserCurrency = typeof userCurrency.$inferSelect;
export type NewUserCurrency = typeof userCurrency.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type SettingDefinition = typeof settingDefinitions.$inferSelect;
export type NewSettingDefinition = typeof settingDefinitions.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  REWARD_EARNED = 'REWARD_EARNED',
}

// ユーザーロール型定義
export type UserRole = 'member' | 'owner' | 'admin';
