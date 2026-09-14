import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { ProjectStatus, TagGroup } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { categories, postProjects, posts, projectTags, projects, tags, users } from '../db/schema.ts'
import { countPendingReports } from './reports.ts'
import { notifyUser } from './notify.ts'

export interface AdminProjectItem {
  id: string
  slug: string
  title: string
  summary: string
  note: string
  coverUrl: string
  screenshots: string[]
  repoUrl: string | null
  demoUrl: string | null
  status: ProjectStatus
  moderationNote: string | null
  categoryName: string | null
  authorName: string
  authorUsername: string
  authorEmailVerified: boolean
  isAi: boolean
  aiModels: string[]
  aiHosting: string | null
  monthlyCostCny: number | null
  monthlyRevenueCny: number | null
  tags: { name: string, slug: string, status: string }[]
  createdAt: string
  updatedAt: string
}

/** 待审与已处理的项目列表，供审核后台使用 */
export async function listProjectsForReview(status: ProjectStatus, limit = 50): Promise<AdminProjectItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      note: projects.body,
      coverUrl: projects.coverUrl,
      screenshots: projects.screenshots,
      repoUrl: projects.repoUrl,
      demoUrl: projects.demoUrl,
      status: projects.status,
      moderationNote: projects.moderationNote,
      categoryName: categories.name,
      authorName: users.nickname,
      authorUsername: users.username,
      authorEmailVerifiedAt: users.emailVerifiedAt,
      isAi: projects.isAi,
      aiModels: projects.aiModels,
      aiHosting: projects.aiHosting,
      monthlyCostCny: projects.monthlyCostCny,
      monthlyRevenueCny: projects.monthlyRevenueCny,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .innerJoin(users, eq(projects.authorId, users.id))
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .where(eq(projects.status, status))
    .orderBy(status === 'pending' ? asc(projects.createdAt) : desc(projects.updatedAt))
    .limit(limit)

  const tagRows = rows.length
    ? await db
        .select({
          projectId: projectTags.projectId,
          name: tags.name,
          slug: tags.slug,
          status: tags.status,
        })
        .from(projectTags)
        .innerJoin(tags, eq(projectTags.tagId, tags.id))
        .where(inArray(projectTags.projectId, rows.map(row => row.id)))
    : []

  const tagsByProject = new Map<string, { name: string, slug: string, status: string }[]>()
  for (const row of tagRows) {
    const list = tagsByProject.get(row.projectId) ?? []
    list.push({ name: row.name, slug: row.slug, status: row.status })
    tagsByProject.set(row.projectId, list)
  }

  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    note: row.note,
    coverUrl: row.coverUrl,
    screenshots: row.screenshots ?? [],
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    status: row.status,
    moderationNote: row.moderationNote,
    categoryName: row.categoryName,
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    authorEmailVerified: row.authorEmailVerifiedAt !== null,
    isAi: row.isAi,
    aiModels: row.aiModels ?? [],
    aiHosting: row.aiHosting,
    monthlyCostCny: row.monthlyCostCny,
    monthlyRevenueCny: row.monthlyRevenueCny,
    tags: tagsByProject.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

async function refreshTagUsage(tagIds: string[]): Promise<void> {
  if (!tagIds.length) return

  await db.execute(sql`
    update tags set usage_count = (
      select count(*) from project_tags pt
      join projects p on p.id = pt.project_id
      where pt.tag_id = tags.id and p.status = 'published'
    )
    where tags.id in (${sql.join(tagIds.map(id => sql`${id}::uuid`), sql`, `)})
  `)
}

export interface ReviewResult {
  slug: string
  status: ProjectStatus
}

export async function reviewProject(
  adminId: string,
  slug: string,
  action: 'approve' | 'reject' | 'offline',
  note: string,
): Promise<ReviewResult> {
  const [existing] = await db
    .select({ id: projects.id, authorId: projects.authorId, title: projects.title })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在' })
  }

  const status: ProjectStatus = action === 'approve'
    ? 'published'
    : action === 'reject' ? 'rejected' : 'offline'

  const moderationNote = note.trim()
    || (action === 'approve'
      ? '审核通过'
      : action === 'reject' ? '内容不符合收录要求' : '已下架')

  await db.update(projects).set({
    status,
    moderationSource: 'manual',
    moderationNote: moderationNote.slice(0, 500),
    publishedAt: action === 'approve' ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(projects.id, existing.id))

  // 上架/下架会影响标签的热度统计
  const tagRows = await db
    .select({ tagId: projectTags.tagId })
    .from(projectTags)
    .where(eq(projectTags.projectId, existing.id))

  await refreshTagUsage(tagRows.map(row => row.tagId))

  // 通知作者审核结果
  const approved = action === 'approve'
  await notifyUser({
    userId: existing.authorId,
    type: approved ? 'project_approved' : 'project_rejected',
    title: approved
      ? `你的项目《${existing.title}》已上线`
      : `你的项目《${existing.title}》未通过审核`,
    body: moderationNote,
    link: approved ? `/projects/${slug}` : '/me/projects',
    email: {
      subject: approved
        ? `你的项目《${existing.title}》已上线`
        : `你的项目《${existing.title}》未通过审核`,
      text: approved
        ? `好消息，你的项目《${existing.title}》已通过审核并公开。`
        : `你的项目《${existing.title}》未通过审核。\n审核意见：${moderationNote}`,
    },
  })

  void adminId

  return { slug, status }
}

export interface AdminTagItem {
  id: string
  name: string
  slug: string
  group: TagGroup
  status: string
  usageCount: number
  description: string | null
  creatorName: string | null
  createdAt: string
}

export async function listTagsForReview(status: string, limit = 100): Promise<AdminTagItem[]> {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      group: tags.tagGroup,
      status: tags.status,
      usageCount: tags.usageCount,
      description: tags.description,
      creatorName: users.nickname,
      createdAt: tags.createdAt,
    })
    .from(tags)
    .leftJoin(users, eq(tags.createdBy, users.id))
    .where(eq(tags.status, status as 'pending' | 'approved' | 'rejected'))
    .orderBy(status === 'pending' ? asc(tags.createdAt) : desc(tags.createdAt))
    .limit(limit)

  return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

export async function reviewTag(
  adminId: string,
  tagId: string,
  action: 'approve' | 'reject',
  note: string,
): Promise<{ id: string, status: string }> {
  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.id, tagId))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '标签不存在' })
  }

  const status = action === 'approve' ? 'approved' : 'rejected'

  await db.update(tags).set({
    status,
    reviewedBy: adminId,
    reviewedAt: new Date(),
    reviewNote: note.trim().slice(0, 300) || null,
  }).where(eq(tags.id, tagId))

  await refreshTagUsage([tagId])

  return { id: tagId, status }
}

export async function adminSummary() {
  const [pendingProjects] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.status, 'pending'))

  const [publishedProjects] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.status, 'published'))

  const [pendingTags] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tags)
    .where(and(eq(tags.status, 'pending')))

  const [pendingPosts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(eq(posts.status, 'pending'))

  const pendingReports = await countPendingReports()

  return {
    pendingProjects: pendingProjects?.count ?? 0,
    publishedProjects: publishedProjects?.count ?? 0,
    pendingTags: pendingTags?.count ?? 0,
    pendingPosts: pendingPosts?.count ?? 0,
    pendingReports,
  }
}
