import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { ManagedProject, MyProjectItem, SessionUser } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { categories, comments, favorites, likes, projectTags, projects, reports, tags } from '../db/schema.ts'
import type { ProjectInput } from './project-input.ts'
import { uniqueProjectSlug, uniqueTagSlug } from './slug.ts'
import { notifyUser } from './notify.ts'

function toColumns(input: ProjectInput) {
  return {
    title: input.title,
    summary: input.summary,
    body: input.body,
    coverUrl: input.coverUrl,
    screenshots: input.screenshots,
    repoUrl: input.repoUrl,
    demoUrl: input.demoUrl,
    extraLinks: input.extraLinks,
    categoryId: input.categoryId,
    isAi: input.isAi,
    aiModels: input.isAi ? input.aiModels : [],
    aiHosting: input.isAi ? input.aiHosting : null,
    monthlyCostCny: input.monthlyCostCny,
    monthlyRevenueCny: input.monthlyRevenueCny,
    totalRevenueCny: input.totalRevenueCny,
    revenueModel: input.revenueModel,
    costNote: input.costNote,
    revenueNote: input.revenueNote,
    updatedAt: new Date(),
  }
}

/** 已有标签直接关联；新标签先入库为待审核状态 */
async function resolveTagIds(input: ProjectInput, userId: string): Promise<string[]> {
  const ids: string[] = []

  if (input.tagIds.length) {
    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(inArray(tags.id, input.tagIds), eq(tags.status, 'approved')))
    ids.push(...rows.map(row => row.id))
  }

  for (const candidate of input.newTags) {
    const [existing] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, candidate.name))
      .limit(1)

    if (existing) {
      ids.push(existing.id)
      continue
    }

    const [row] = await db.insert(tags).values({
      name: candidate.name,
      slug: await uniqueTagSlug(candidate.name),
      tagGroup: candidate.group,
      status: 'pending',
      createdBy: userId,
    }).returning({ id: tags.id })

    ids.push(row!.id)
  }

  return [...new Set(ids)]
}

/** 标签使用次数只统计已发布项目 */
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

async function replaceProjectTags(projectId: string, tagIds: string[]): Promise<void> {
  const previous = await db
    .select({ tagId: projectTags.tagId })
    .from(projectTags)
    .where(eq(projectTags.projectId, projectId))

  await db.delete(projectTags).where(eq(projectTags.projectId, projectId))

  if (tagIds.length) {
    await db.insert(projectTags).values(tagIds.map(tagId => ({ projectId, tagId })))
  }

  await refreshTagUsage([...previous.map(row => row.tagId), ...tagIds])
}

export async function createProject(user: SessionUser, input: ProjectInput) {
  const slug = await uniqueProjectSlug(input.title)
  const tagIds = await resolveTagIds(input, user.id)

  // 管理员自己发布时直接上线，普通用户进入待审队列（AI 审核在 D5 接入）
  const autoPublish = user.role === 'admin' && input.status === 'pending'

  const [row] = await db.insert(projects).values({
    ...toColumns(input),
    slug,
    authorId: user.id,
    status: autoPublish ? 'published' : input.status,
    moderationSource: autoPublish ? 'manual' : null,
    publishedAt: autoPublish ? new Date() : null,
  }).returning({ id: projects.id, slug: projects.slug, status: projects.status })

  await replaceProjectTags(row!.id, tagIds)

  return { ...row!, pendingTagCount: input.newTags.length }
}

export async function updateProject(user: SessionUser, slug: string, input: ProjectInput) {
  const [existing] = await db
    .select({ id: projects.id, authorId: projects.authorId, status: projects.status })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在' })
  }

  const isOwner = existing.authorId === user.id
  const isAdmin = user.role === 'admin'
  if (!isOwner && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: '只能编辑自己发布的项目' })
  }

  // 已发布的项目被作者改动后需要重新审核；管理员改动视为已审
  let nextStatus: 'draft' | 'pending' | 'published' = input.status === 'draft' ? 'draft' : 'pending'
  if (isAdmin && input.status === 'pending') nextStatus = 'published'

  const tagIds = await resolveTagIds(input, user.id)

  await db.update(projects).set({
    ...toColumns(input),
    status: nextStatus,
    publishedAt: nextStatus === 'published' ? new Date() : null,
  }).where(eq(projects.id, existing.id))

  await replaceProjectTags(existing.id, tagIds)

  return {
    id: existing.id,
    slug,
    status: nextStatus,
    pendingTagCount: input.newTags.length,
  }
}

async function tagsFor(projectIds: string[]) {
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

export async function listMyProjects(userId: string): Promise<MyProjectItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      coverUrl: projects.coverUrl,
      status: projects.status,
      moderationNote: projects.moderationNote,
      categoryName: categories.name,
      viewCount: projects.viewCount,
      likeCount: projects.likeCount,
      favoriteCount: projects.favoriteCount,
      commentCount: projects.commentCount,
      publishedAt: projects.publishedAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .where(eq(projects.authorId, userId))
    .orderBy(desc(projects.updatedAt))

  const tagMap = await tagsFor(rows.map(row => row.id))

  return rows.map(row => ({
    ...row,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
    tags: tagMap.get(row.id) ?? [],
  }))
}

export async function getManagedProject(user: SessionUser, slug: string): Promise<ManagedProject> {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在' })
  }

  if (row.authorId !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '只能查看自己发布的项目' })
  }

  const tagMap = await tagsFor([row.id])

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    moderationNote: row.moderationNote,
    title: row.title,
    summary: row.summary,
    body: row.body,
    coverUrl: row.coverUrl,
    screenshots: row.screenshots ?? [],
    categoryId: row.categoryId,
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    extraLinks: row.extraLinks ?? [],
    isAi: row.isAi,
    aiModels: row.aiModels ?? [],
    aiHosting: row.aiHosting,
    monthlyCostCny: row.monthlyCostCny,
    monthlyRevenueCny: row.monthlyRevenueCny,
    totalRevenueCny: row.totalRevenueCny,
    revenueModel: row.revenueModel,
    costNote: row.costNote,
    revenueNote: row.revenueNote,
    tags: tagMap.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * 删除项目（作者本人或管理员）。
 * 评论、点赞、收藏、举报与标签关联一并清理，避免留下孤立数据；
 * 管理员删除他人项目时通知作者。
 */
export async function deleteProject(user: SessionUser, slug: string): Promise<void> {
  const [existing] = await db
    .select({ id: projects.id, authorId: projects.authorId, title: projects.title })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在' })
  }

  const isAdmin = user.role === 'admin'
  if (existing.authorId !== user.id && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: '只能删除自己发布的项目' })
  }

  await db.delete(comments).where(and(
    eq(comments.targetType, 'project'),
    eq(comments.targetId, existing.id),
  ))
  await db.delete(likes).where(and(
    eq(likes.targetType, 'project'),
    eq(likes.targetId, existing.id),
  ))
  await db.delete(favorites).where(eq(favorites.projectId, existing.id))
  await db.delete(reports).where(and(
    eq(reports.targetType, 'project'),
    eq(reports.targetId, existing.id),
  ))
  await db.delete(projects).where(eq(projects.id, existing.id))

  if (isAdmin && existing.authorId !== user.id) {
    await notifyUser({
      userId: existing.authorId,
      type: 'project_rejected',
      title: `你的项目《${existing.title}》已被删除`,
      body: '管理员删除了该项目，如有疑问可以通过反馈渠道联系。',
      link: '/me/projects',
      email: {
        subject: `你的项目《${existing.title}》已被删除`,
        text: `管理员删除了你的项目《${existing.title}》。`,
      },
    })
  }
}
