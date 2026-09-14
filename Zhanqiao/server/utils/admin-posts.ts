import { asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { postProjects, posts, projects, users } from '../db/schema.ts'
import { notifyUser } from './notify.ts'

export interface AdminPostItem {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  coverUrl: string | null
  tags: string[]
  status: string
  moderationNote: string | null
  source: string
  authorName: string
  authorUsername: string | null
  authorEmailVerified: boolean
  projects: { name: string, slug: string }[]
  createdAt: string
  updatedAt: string
}

export async function listPostsForReview(status: string, limit = 50): Promise<AdminPostItem[]> {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      body: posts.body,
      coverUrl: posts.coverUrl,
      tags: posts.tags,
      status: posts.status,
      moderationNote: posts.moderationNote,
      source: posts.source,
      authorName: posts.authorName,
      authorUsername: posts.authorUsername,
      authorEmailVerifiedAt: users.emailVerifiedAt,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.status, status as 'draft' | 'pending' | 'published' | 'rejected' | 'offline'))
    .orderBy(status === 'pending' ? asc(posts.createdAt) : desc(posts.updatedAt))
    .limit(limit)

  const projectRows = rows.length
    ? await db
        .select({ postId: postProjects.postId, name: projects.title, slug: projects.slug })
        .from(postProjects)
        .innerJoin(projects, eq(postProjects.projectId, projects.id))
        .where(inArray(postProjects.postId, rows.map(row => row.id)))
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
    body: row.body,
    coverUrl: row.coverUrl,
    tags: row.tags ?? [],
    status: row.status,
    moderationNote: row.moderationNote,
    source: row.source,
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    authorEmailVerified: row.authorEmailVerifiedAt !== null,
    projects: projectMap.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function reviewPost(
  adminId: string,
  slug: string,
  action: 'approve' | 'reject' | 'offline',
  note: string,
): Promise<{ slug: string, status: string }> {
  const [existing] = await db
    .select({
      id: posts.id,
      publishedAt: posts.publishedAt,
      authorId: posts.authorId,
      title: posts.title,
    })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  const status = action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'offline'
  const moderationNote = note.trim()
    || (action === 'approve' ? '审核通过' : action === 'reject' ? '内容不符合发布要求' : '已下架')

  await db.update(posts).set({
    status,
    moderationSource: 'manual',
    moderationNote: moderationNote.slice(0, 500),
    publishedAt: action === 'approve' ? (existing.publishedAt ?? new Date()) : null,
    updatedAt: new Date(),
  }).where(eq(posts.id, existing.id))

  const approved = action === 'approve'
  if (existing.authorId) {
    await notifyUser({
      userId: existing.authorId,
      type: approved ? 'post_approved' : 'post_rejected',
      title: approved
        ? `你的文章《${existing.title}》已发布`
        : `你的文章《${existing.title}》未通过审核`,
      body: moderationNote,
      link: approved ? `/blog/${slug}` : '/me/posts',
      email: {
        subject: approved
          ? `你的文章《${existing.title}》已发布`
          : `你的文章《${existing.title}》未通过审核`,
        text: approved
          ? `你的文章《${existing.title}》已通过审核，现在可以在博客里看到了。`
          : `你的文章《${existing.title}》未通过审核。\n审核意见：${moderationNote}`,
      },
    })
  }

  void adminId

  return { slug, status }
}
