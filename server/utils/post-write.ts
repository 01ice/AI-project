import { and, desc, eq, inArray } from 'drizzle-orm'
import type { ManagedPost, MyPostItem, PostStatus, SessionUser } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { comments, likes, postProjects, posts, projects } from '../db/schema.ts'
import type { PostInput } from './post-input.ts'
import { uniquePostSlug } from './slug.ts'

/** 摘要留空时从正文里提取一段 */
function fallbackSummary(body: string): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}.*$/gm, ' ')
    .replace(/[*_`>#\-[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.slice(0, 140) || '（暂无摘要）'
}

async function resolveProjectIds(slugs: string[]) {
  if (!slugs.length) return { ids: [] as string[], missing: [] as string[] }

  const rows = await db
    .select({ id: projects.id, slug: projects.slug })
    .from(projects)
    .where(inArray(projects.slug, slugs))

  const found = new Map(rows.map(row => [row.slug, row.id]))
  return {
    ids: rows.map(row => row.id),
    missing: slugs.filter(slug => !found.has(slug)),
  }
}

async function replaceProjects(postId: string, projectIds: string[]) {
  await db.delete(postProjects).where(eq(postProjects.postId, postId))
  if (projectIds.length) {
    await db.insert(postProjects).values(projectIds.map(projectId => ({ postId, projectId })))
  }
}

function resolveStatus(user: SessionUser, requested: PostInput['status'], current?: PostStatus): PostStatus {
  if (requested === 'draft') return 'draft'
  // 管理员发布直接上线；成员投稿进待审；已发布的文章被作者改动后重新送审
  if (user.role === 'admin') return 'published'
  if (current === 'pending') return 'pending'
  return 'pending'
}

export async function createPost(user: SessionUser, input: PostInput) {
  const slug = await uniquePostSlug(input.slug || input.title)
  const status = resolveStatus(user, input.status)
  const { ids, missing } = await resolveProjectIds(input.projectSlugs)

  const [row] = await db.insert(posts).values({
    slug,
    title: input.title,
    summary: (input.summary || fallbackSummary(input.body)).slice(0, 300),
    body: input.body,
    coverUrl: input.coverUrl || `/api/cover/${slug}`,
    tags: input.tags,
    authorId: user.id,
    authorName: user.nickname,
    authorUsername: user.username,
    source: 'editor',
    status,
    moderationSource: status === 'published' ? 'manual' : null,
    publishedAt: status === 'published' ? new Date() : null,
  }).returning({ id: posts.id, slug: posts.slug, status: posts.status })

  await replaceProjects(row!.id, ids)

  return { ...row!, missingProjects: missing }
}

export async function updatePost(user: SessionUser, slug: string, input: PostInput) {
  const [existing] = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  const isOwner = existing.authorId === user.id
  const isAdmin = user.role === 'admin'
  if (!isOwner && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: '只能编辑自己写的文章' })
  }

  if (existing.source === 'git' && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: '这篇文章来自仓库里的 Markdown 文件，请在仓库里修改',
    })
  }

  // 允许修改 slug，但要保证唯一
  let nextSlug = existing.slug
  if (input.slug && input.slug !== existing.slug) {
    nextSlug = await uniquePostSlug(input.slug, existing.id)
  }

  const status = resolveStatus(user, input.status, existing.status)
  const { ids, missing } = await resolveProjectIds(input.projectSlugs)

  await db.update(posts).set({
    slug: nextSlug,
    title: input.title,
    summary: (input.summary || fallbackSummary(input.body)).slice(0, 300),
    body: input.body,
    coverUrl: input.coverUrl || existing.coverUrl || `/api/cover/${nextSlug}`,
    tags: input.tags,
    status,
    publishedAt: status === 'published' ? (existing.publishedAt ?? new Date()) : null,
    updatedAt: new Date(),
  }).where(eq(posts.id, existing.id))

  await replaceProjects(existing.id, ids)

  return { id: existing.id, slug: nextSlug, status, missingProjects: missing }
}

export async function listMyPosts(userId: string): Promise<MyPostItem[]> {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      coverUrl: posts.coverUrl,
      status: posts.status,
      source: posts.source,
      moderationNote: posts.moderationNote,
      tags: posts.tags,
      viewCount: posts.viewCount,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.updatedAt))

  const ids = rows.map(row => row.id)
  const projectRows = ids.length
    ? await db
        .select({ postId: postProjects.postId, name: projects.title, slug: projects.slug })
        .from(postProjects)
        .innerJoin(projects, eq(postProjects.projectId, projects.id))
        .where(inArray(postProjects.postId, ids))
    : []

  const projectMap = new Map<string, { name: string, slug: string }[]>()
  for (const row of projectRows) {
    const list = projectMap.get(row.postId) ?? []
    list.push({ name: row.name, slug: row.slug })
    projectMap.set(row.postId, list)
  }

  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    status: row.status,
    source: row.source,
    moderationNote: row.moderationNote,
    tags: row.tags ?? [],
    viewCount: row.viewCount,
    projects: projectMap.get(row.id) ?? [],
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function getManagedPost(user: SessionUser, slug: string): Promise<ManagedPost> {
  const [row] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  if (row.authorId !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '只能编辑自己写的文章' })
  }

  const projectRows = await db
    .select({ slug: projects.slug })
    .from(postProjects)
    .innerJoin(projects, eq(postProjects.projectId, projects.id))
    .where(eq(postProjects.postId, row.id))

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    coverUrl: row.coverUrl,
    tags: row.tags ?? [],
    projectSlugs: projectRows.map(item => item.slug),
    status: row.status,
    moderationNote: row.moderationNote,
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function isPostSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.slug, slug)))
    .limit(1)

  return Boolean(row && row.id !== excludeId)
}

/**
 * 删除文章（作者本人或管理员）。
 * 评论、点赞一并清理，避免留下孤立数据。
 */
export async function deletePost(user: SessionUser, slug: string): Promise<void> {
  const [existing] = await db
    .select({ id: posts.id, authorId: posts.authorId, source: posts.source })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  const isAdmin = user.role === 'admin'
  if (existing.authorId !== user.id && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: '只能删除自己写的文章' })
  }

  if (existing.source === 'git' && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: '这篇文章来自仓库里的 Markdown 文件，请在仓库中删除',
    })
  }

  await db.delete(comments).where(and(
    eq(comments.targetType, 'post'),
    eq(comments.targetId, existing.id),
  ))
  await db.delete(likes).where(and(
    eq(likes.targetType, 'post'),
    eq(likes.targetId, existing.id),
  ))
  await db.delete(posts).where(eq(posts.id, existing.id))
}
