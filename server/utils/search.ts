import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { categories, posts, projectTags, projects, tags, users } from '../db/schema.ts'

export interface SearchProjectItem {
  id: string
  slug: string
  title: string
  summary: string
  coverUrl: string
  categoryName: string | null
  authorName: string
  authorUsername: string
  tags: { name: string, slug: string }[]
  likeCount: number
  favoriteCount: number
  commentCount: number
  viewCount: number
  publishedAt: string | null
  metrics: {
    isAi: boolean
    models: string[]
    hosting: 'api' | 'self_hosted' | 'hybrid' | null
    monthlyCostCny: number | null
    monthlyRevenueCny: number | null
    totalRevenueCny: number | null
    revenueModel: string | null
    costNote: string | null
    revenueNote: string | null
  }
}

export interface SearchPostItem {
  id: string
  slug: string
  title: string
  summary: string
  coverUrl: string | null
  authorName: string
  authorUsername: string | null
  publishedAt: string
  tags: string[]
}

/**
 * 关键词搜索。
 * 中文没有天然的词边界，标准全文检索需要额外分词组件，
 * 这里用 ILIKE 子串匹配 + 相关性排序（标题命中优先），对中文足够直观。
 */
export async function searchAll(keyword: string, limit = 10) {
  const q = keyword.trim()
  if (!q) return { projects: [] as SearchProjectItem[], posts: [] as SearchPostItem[] }

  const like = `%${q}%`
  const rankTitle = sql`case when ${projects.title} ilike ${like} then 0 else 1 end`
  const tagMatch = sql`exists (
    select 1 from project_tags pt
    join tags t on t.id = pt.tag_id
    where pt.project_id = ${projects.id} and (t.name ilike ${like} or t.slug ilike ${like})
  )`

  const projectRows = await db
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
      commentCount: projects.commentCount,
      viewCount: projects.viewCount,
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
    .where(and(
      eq(projects.status, 'published'),
      or(
        ilike(projects.title, like),
        ilike(projects.summary, like),
        ilike(projects.body, like),
        tagMatch,
      ),
    ))
    .orderBy(rankTitle, desc(projects.viewCount))
    .limit(limit)

  const projectIds = projectRows.map(row => row.id)
  const tagRows = projectIds.length
    ? await db
        .select({ projectId: projectTags.projectId, name: tags.name, slug: tags.slug })
        .from(projectTags)
        .innerJoin(tags, eq(projectTags.tagId, tags.id))
        .where(inArray(projectTags.projectId, projectIds))
    : []

  const tagMap = new Map<string, { name: string, slug: string }[]>()
  for (const row of tagRows) {
    const list = tagMap.get(row.projectId) ?? []
    list.push({ name: row.name, slug: row.slug })
    tagMap.set(row.projectId, list)
  }

  const postRows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      coverUrl: posts.coverUrl,
      authorName: posts.authorName,
      authorUsername: posts.authorUsername,
      publishedAt: posts.publishedAt,
      tags: posts.tags,
      viewCount: posts.viewCount,
    })
    .from(posts)
    .where(and(
      eq(posts.status, 'published'),
      or(ilike(posts.title, like), ilike(posts.summary, like), ilike(posts.body, like)),
    ))
    .orderBy(sql`case when ${posts.title} ilike ${like} then 0 else 1 end`, desc(posts.publishedAt))
    .limit(limit)

  return {
    projects: projectRows.map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      coverUrl: row.coverUrl,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      authorName: row.authorName,
      authorUsername: row.authorUsername,
      authorAvatarUrl: row.authorAvatarUrl,
      tags: tagMap.get(row.id) ?? [],
      likeCount: row.likeCount,
      favoriteCount: row.favoriteCount,
      commentCount: row.commentCount,
      viewCount: row.viewCount,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      metrics: {
        isAi: row.isAi,
        models: row.aiModels ?? [],
        hosting: row.aiHosting,
        monthlyCostCny: row.monthlyCostCny,
        monthlyRevenueCny: row.monthlyRevenueCny,
        totalRevenueCny: row.totalRevenueCny,
        revenueModel: row.revenueModel,
        costNote: row.costNote,
        revenueNote: row.revenueNote,
      },
    })) satisfies SearchProjectItem[],
    posts: postRows.map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      coverUrl: row.coverUrl,
      authorName: row.authorName,
      authorUsername: row.authorUsername,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : new Date().toISOString(),
      tags: row.tags ?? [],
      projects: [],
      viewCount: row.viewCount,
    })) satisfies SearchPostItem[],
  }
}
