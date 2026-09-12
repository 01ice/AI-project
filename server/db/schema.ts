import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// ===== 枚举 =====
export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])
export const userStatusEnum = pgEnum('user_status', ['active', 'muted', 'banned'])
export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'pending',
  'published',
  'rejected',
  'offline',
])
export const moderationSourceEnum = pgEnum('moderation_source', [
  'rule',
  'content_security',
  'llm',
  'manual',
])
export const tagStatusEnum = pgEnum('tag_status', ['pending', 'approved', 'rejected'])
export const commentStatusEnum = pgEnum('comment_status', ['visible', 'hidden', 'deleted'])
export const reportStatusEnum = pgEnum('report_status', ['pending', 'resolved', 'dismissed'])
export const targetTypeEnum = pgEnum('target_type', ['project', 'post'])
export const tagGroupEnum = pgEnum('tag_group', ['stack', 'ai_model', 'ai_tech', 'ai_domain'])
export const aiHostingEnum = pgEnum('ai_hosting', ['api', 'self_hosted', 'hybrid'])
export const revenueModelEnum = pgEnum('revenue_model', [
  'free',
  'freemium',
  'subscription',
  'one_time',
  'ads',
  'service',
  'not_yet',
])
export const emailCodePurposeEnum = pgEnum('email_code_purpose', ['register', 'reset_password'])

// ===== 用户 =====
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 32 }).notNull().unique(),
  nickname: varchar('nickname', { length: 32 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  emailVerifyToken: varchar('email_verify_token', { length: 64 }),
  emailVerifyExpiresAt: timestamp('email_verify_expires_at', { withTimezone: true }),
  passwordResetToken: varchar('password_reset_token', { length: 64 }),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  bio: varchar('bio', { length: 200 }),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 64 }),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip: varchar('ip', { length: 64 }),
  userAgent: varchar('user_agent', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('sessions_user_idx').on(table.userId),
])

/** 邮箱验证码：注册与找回密码共用，存哈希不存明文 */
export const emailCodes = pgTable('email_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  purpose: emailCodePurposeEnum('purpose').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
  ip: varchar('ip', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('email_codes_lookup_idx').on(table.email, table.purpose, table.createdAt),
])

// ===== 分类与标签 =====
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 32 }).notNull().unique(),
  slug: varchar('slug', { length: 32 }).notNull().unique(),
  description: varchar('description', { length: 200 }),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 32 }).notNull().unique(),
  slug: varchar('slug', { length: 32 }).notNull().unique(),
  tagGroup: tagGroupEnum('tag_group').notNull().default('stack'),
  description: varchar('description', { length: 200 }),
  status: tagStatusEnum('status').notNull().default('pending'),
  usageCount: integer('usage_count').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewNote: varchar('review_note', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
})

// ===== 项目 =====
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  title: varchar('title', { length: 80 }).notNull(),
  summary: varchar('summary', { length: 200 }).notNull(),
  body: text('body').notNull(),
  coverUrl: text('cover_url').notNull(),
  screenshots: jsonb('screenshots').$type<string[]>().notNull().default([]),
  repoUrl: text('repo_url'),
  demoUrl: text('demo_url'),
  extraLinks: jsonb('extra_links').$type<{ label: string, url: string }[]>().notNull().default([]),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: projectStatusEnum('status').notNull().default('draft'),
  moderationSource: moderationSourceEnum('moderation_source'),
  moderationNote: varchar('moderation_note', { length: 500 }),
  // ===== AI 项目信息（作者自行填写）=====
  isAi: boolean('is_ai').notNull().default(false),
  aiModels: jsonb('ai_models').$type<string[]>().notNull().default([]),
  aiHosting: aiHostingEnum('ai_hosting'),
  monthlyCostCny: integer('monthly_cost_cny'),
  monthlyRevenueCny: integer('monthly_revenue_cny'),
  totalRevenueCny: integer('total_revenue_cny'),
  revenueModel: revenueModelEnum('revenue_model'),
  costNote: varchar('cost_note', { length: 200 }),
  revenueNote: varchar('revenue_note', { length: 200 }),
  featured: boolean('featured').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  favoriteCount: integer('favorite_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('projects_status_published_idx').on(table.status, table.publishedAt),
  index('projects_ai_idx').on(table.isAi, table.status, table.publishedAt),
  index('projects_category_idx').on(table.categoryId),
  index('projects_author_idx').on(table.authorId),
])

export const projectTags = pgTable('project_tags', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, table => [
  primaryKey({ columns: [table.projectId, table.tagId] }),
  index('project_tags_tag_idx').on(table.tagId),
])

// ===== 互动 =====
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: targetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: uuid('parent_id'),
  rootId: uuid('root_id'),
  replyToUserId: uuid('reply_to_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: commentStatusEnum('status').notNull().default('visible'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('comments_target_idx').on(table.targetType, table.targetId),
  index('comments_root_idx').on(table.rootId),
])

export const likes = pgTable('likes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: targetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.userId, table.targetType, table.targetId] }),
])

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.userId, table.projectId] }),
])

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: targetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: varchar('reason', { length: 32 }).notNull(),
  detail: varchar('detail', { length: 500 }),
  status: reportStatusEnum('status').notNull().default('pending'),
  handledBy: uuid('handled_by').references(() => users.id, { onDelete: 'set null' }),
  handledAt: timestamp('handled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('reports_status_idx').on(table.status),
])

export const moderationLogs = pgTable('moderation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: targetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  stage: moderationSourceEnum('stage').notNull(),
  inputDigest: text('input_digest'),
  model: varchar('model', { length: 64 }),
  promptVersion: varchar('prompt_version', { length: 32 }),
  rawOutput: jsonb('raw_output'),
  decision: varchar('decision', { length: 16 }).notNull(),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('moderation_logs_target_idx').on(table.targetType, table.targetId),
])
