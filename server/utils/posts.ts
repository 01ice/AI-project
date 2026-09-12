import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import type {
  PostDetail,
  PostListItem,
  PostListResponse,
  RelatedPostItem,
} from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { postProjects, posts, projects } from '../db/schema.ts'
import { renderMarkdown } from './markdown.ts'

export interface ListPostsParams {
  tag?: string
  q?: string
  page?: number
  pageSize?: number
}

async function projectsForPosts(postIds: string[]) {
  const map = new Map<string, { name: string, slug: string }[]>()
  if (!postIds.length) return map

  const rows = await db
    .select({ postId: postProjects.postId, name: projects.title, slug: projects.slug })
    .from(postProjects)
    .innerJoin(projects, eq(postProjects.projectId, projects.id))
    .where(inArray(postProjects.postId, postIds))

  for (const row of rows) {
    const list = map.get(row.postId) ?? []
    list.push({ name: row.name, slug: row.slug })
    map.set(row.postId, list)
  }

  return map
}

export async function listPosts(params: ListPostsParams): Promise<PostListResponse> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10))

  const conditions = [eq(posts.status, 'published')]

  if (params.tag) {
    conditions.push(sql`${posts.tags} @> ${JSON.stringify([params.tag])}::jsonb`)
  }

  if (params.q) {
    const keyword = `%${params.q}%`
    conditions.push(or(ilike(posts.title, keyword), ilike(posts.summary, keyword))!)
  }

  const where = and(...conditions)

  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      coverUrl: posts.coverUrl,
      tags: posts.tags,
      authorName: posts.authorName,
      authorUsername: posts.authorUsername,
      publishedAt: posts.publishedAt,
      viewCount: posts.viewCount,
    })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.publishedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const projectMap = await projectsForPosts(rows.map(row => row.id))

  const items: PostListItem[] = rows.map(row => ({
    ...row,
    tags: row.tags ?? [],
    publishedAt: row.publishedAt.toISOString(),
    projects: projectMap.get(row.id) ?? [],
  }))

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
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

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
    .limit(1)

  if (!row) return null

  const projectMap = await projectsForPosts([row.id])

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    tags: row.tags ?? [],
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    viewCount: row.viewCount,
    projects: projectMap.get(row.id) ?? [],
    bodyHtml: renderMarkdown(row.body),
  }
}

export async function incrementPostViews(postId: string): Promise<void> {
  await db.update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, postId))
}

/** 某个项目关联的文章，用于项目详情页的「相关文章」 */
export async function relatedPostsForProject(projectId: string): Promise<RelatedPostItem[]> {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      authorName: posts.authorName,
      publishedAt: posts.publishedAt,
    })
    .from(postProjects)
    .innerJoin(posts, eq(postProjects.postId, posts.id))
    .where(and(eq(postProjects.projectId, projectId), eq(posts.status, 'published')))
    .orderBy(desc(posts.publishedAt))

  return rows.map(row => ({ ...row, publishedAt: row.publishedAt.toISOString() }))
}
