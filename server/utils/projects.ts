import { and, asc, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm'
import type {
  CategoryItem,
  CommentItem,
  ProjectDetail,
  ProjectListItem,
  ProjectListResponse,
  ProjectMetrics,
  TagItem,
} from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { categories, comments, projectTags, projects, tags, users } from '../db/schema.ts'
import { renderMarkdown } from './markdown.ts'

export interface ListProjectsParams {
  category?: string
  tag?: string
  q?: string
  ai?: boolean
  /** 只看填写了成本或收益的项目 */
  withMetrics?: boolean
  sort?: 'latest' | 'hot' | 'featured' | 'profit' | 'revenue' | 'cost'
  page?: number
  pageSize?: number
}

function buildProjectConditions(params: ListProjectsParams) {
  const conditions = [eq(projects.status, 'published')]

  if (params.category) {
    conditions.push(inArray(
      projects.categoryId,
      db.select({ id: categories.id }).from(categories).where(eq(categories.slug, params.category)),
    ))
  }

  if (params.tag) {
    conditions.push(inArray(
      projects.id,
      db
        .select({ projectId: projectTags.projectId })
        .from(projectTags)
        .innerJoin(tags, eq(projectTags.tagId, tags.id))
        .where(eq(tags.slug, params.tag)),
    ))
  }

  if (params.q) {
    const keyword = `%${params.q}%`
    conditions.push(or(ilike(projects.title, keyword), ilike(projects.summary, keyword))!)
  }

  if (params.ai) {
    conditions.push(eq(projects.isAi, true))
  }

  if (params.withMetrics) {
    conditions.push(or(
      isNotNull(projects.monthlyCostCny),
      isNotNull(projects.monthlyRevenueCny),
    )!)
  }

  // 排行榜必须建立在真实填写过的数据之上，避免空值占位
  if (params.sort === 'profit' || params.sort === 'revenue') {
    conditions.push(isNotNull(projects.monthlyRevenueCny))
  }
  if (params.sort === 'cost') {
    conditions.push(isNotNull(projects.monthlyCostCny))
  }

  return and(...conditions)
}

function toMetrics(row: {
  isAi: boolean
  aiModels: string[] | null
  aiHosting: 'api' | 'self_hosted' | 'hybrid' | null
  monthlyCostCny: number | null
  monthlyRevenueCny: number | null
  totalRevenueCny: number | null
  revenueModel: 'free' | 'freemium' | 'subscription' | 'one_time' | 'ads' | 'service' | 'not_yet' | null
  costNote: string | null
  revenueNote: string | null
}): ProjectMetrics {
  return {
    isAi: row.isAi,
    models: row.aiModels ?? [],
    hosting: row.aiHosting,
    monthlyCostCny: row.monthlyCostCny,
    monthlyRevenueCny: row.monthlyRevenueCny,
    totalRevenueCny: row.totalRevenueCny,
    revenueModel: row.revenueModel,
    costNote: row.costNote,
    revenueNote: row.revenueNote,
  }
}

function projectOrder(sort: ListProjectsParams['sort']) {
  switch (sort) {
    case 'hot':
      return [desc(projects.viewCount), desc(projects.likeCount)]
    case 'featured':
      return [desc(projects.featured), desc(projects.publishedAt)]
    case 'profit':
      return [desc(sql`coalesce(${projects.monthlyRevenueCny}, 0) - coalesce(${projects.monthlyCostCny}, 0)`)]
    case 'revenue':
      return [desc(projects.monthlyRevenueCny)]
    case 'cost':
      return [asc(projects.monthlyCostCny)]
    default:
      return [desc(projects.publishedAt)]
  }
}

export async function listProjects(params: ListProjectsParams): Promise<ProjectListResponse> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12))
  const where = buildProjectConditions(params)

  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      coverUrl: projects.coverUrl,
      categoryName: categories.name,
      categorySlug: categories.slug,
      authorName: users.nickname,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
      likeCount: projects.likeCount,
      favoriteCount: projects.favoriteCount,
      viewCount: projects.viewCount,
      commentCount: projects.commentCount,
      publishedAt: projects.publishedAt,
      isAi: projects.isAi,
      aiModels: projects.aiModels,
      aiHosting: projects.aiHosting,
      monthlyCostCny: projects.monthlyCostCny,
      monthlyRevenueCny: projects.monthlyRevenueCny,
      totalRevenueCny: projects.totalRevenueCny,
      revenueModel: projects.revenueModel,
      costNote: projects.costNote,
      revenueNote: projects.revenueNote,
    })
    .from(projects)
    .innerJoin(users, eq(projects.authorId, users.id))
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .where(where)
    .orderBy(...projectOrder(params.sort))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const tagMap = await loadTagsForProjects(rows.map(row => row.id))
  const items: ProjectListItem[] = rows.map((row) => {
    const {
      isAi,
      aiModels,
      aiHosting,
      monthlyCostCny,
      monthlyRevenueCny,
      totalRevenueCny,
      revenueModel,
      costNote,
      revenueNote,
      ...rest
    } = row
    return {
      ...rest,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      tags: tagMap.get(row.id) ?? [],
      metrics: toMetrics({
        isAi,
        aiModels,
        aiHosting,
        monthlyCostCny,
        monthlyRevenueCny,
        totalRevenueCny,
        revenueModel,
        costNote,
        revenueNote,
      }),
    }
  })

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(where)

  const total = countRow?.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

async function loadTagsForProjects(projectIds: string[]): Promise<Map<string, { name: string, slug: string }[]>> {
  const map = new Map<string, { name: string, slug: string }[]>()
  if (!projectIds.length) return map

  const rows = await db
    .select({ projectId: projectTags.projectId, name: tags.name, slug: tags.slug })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, projectIds))

  for (const row of rows) {
    const list = map.get(row.projectId) ?? []
    list.push({ name: row.name, slug: row.slug })
    map.set(row.projectId, list)
  }

  return map
}

export async function getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      body: projects.body,
      coverUrl: projects.coverUrl,
      screenshots: projects.screenshots,
      repoUrl: projects.repoUrl,
      demoUrl: projects.demoUrl,
      extraLinks: projects.extraLinks,
      categoryName: categories.name,
      categorySlug: categories.slug,
      authorName: users.nickname,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
      authorBio: users.bio,
      likeCount: projects.likeCount,
      favoriteCount: projects.favoriteCount,
      viewCount: projects.viewCount,
      commentCount: projects.commentCount,
      publishedAt: projects.publishedAt,
      createdAt: projects.createdAt,
      isAi: projects.isAi,
      aiModels: projects.aiModels,
      aiHosting: projects.aiHosting,
      monthlyCostCny: projects.monthlyCostCny,
      monthlyRevenueCny: projects.monthlyRevenueCny,
      totalRevenueCny: projects.totalRevenueCny,
      revenueModel: projects.revenueModel,
      costNote: projects.costNote,
      revenueNote: projects.revenueNote,
    })
    .from(projects)
    .innerJoin(users, eq(projects.authorId, users.id))
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .where(and(eq(projects.slug, slug), eq(projects.status, 'published')))
    .limit(1)

  if (!row) return null

  const tagMap = await loadTagsForProjects([row.id])
  const {
    body: _body,
    isAi,
    aiModels,
    aiHosting,
    monthlyCostCny,
    monthlyRevenueCny,
    totalRevenueCny,
    revenueModel,
    costNote,
    revenueNote,
    ...rest
  } = row

  return {
    ...rest,
    screenshots: row.screenshots ?? [],
    extraLinks: row.extraLinks ?? [],
    tags: tagMap.get(row.id) ?? [],
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    bodyHtml: renderMarkdown(row.body),
    metrics: toMetrics({
      isAi,
      aiModels,
      aiHosting,
      monthlyCostCny,
      monthlyRevenueCny,
      totalRevenueCny,
      revenueModel,
      costNote,
      revenueNote,
    }),
  }
}

export async function incrementProjectViews(projectId: string): Promise<void> {
  await db
    .update(projects)
    .set({ viewCount: sql`${projects.viewCount} + 1` })
    .where(eq(projects.id, projectId))
}

export async function listCategories(): Promise<CategoryItem[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      projectCount: sql<number>`count(${projects.id})::int`,
    })
    .from(categories)
    .leftJoin(
      projects,
      and(eq(projects.categoryId, categories.id), eq(projects.status, 'published')),
    )
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  return rows
}

export async function listTags(limit = 30, group?: TagItem['group']): Promise<TagItem[]> {
  const conditions = [eq(tags.status, 'approved')]
  if (group) conditions.push(eq(tags.tagGroup, group))

  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      group: tags.tagGroup,
      usageCount: tags.usageCount,
    })
    .from(tags)
    .where(and(...conditions))
    .orderBy(desc(tags.usageCount), asc(tags.name))
    .limit(limit)
}

export async function listComments(targetId: string): Promise<CommentItem[]> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      rootId: comments.rootId,
      authorName: users.nickname,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(
      eq(comments.targetType, 'project'),
      eq(comments.targetId, targetId),
      eq(comments.status, 'visible'),
    ))
    .orderBy(asc(comments.createdAt))

  const nameById = new Map(rows.map(row => [row.id, row.authorName]))
  const rootMap = new Map<string, CommentItem>()
  const items: CommentItem[] = []

  for (const row of rows) {
    const item: CommentItem = {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      authorName: row.authorName,
      authorUsername: row.authorUsername,
      authorAvatarUrl: row.authorAvatarUrl,
      replyToName: row.parentId ? nameById.get(row.parentId) ?? null : null,
      replies: [],
    }

    if (row.rootId && rootMap.has(row.rootId)) {
      rootMap.get(row.rootId)!.replies.push(item)
    }
    else {
      rootMap.set(item.id, item)
      items.push(item)
    }
  }

  return items
}
