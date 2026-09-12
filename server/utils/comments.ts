import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { CommentItem, SessionUser, TargetType } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { comments, posts, projects, users } from '../db/schema.ts'
import { refreshProjectCounters } from './interactions.ts'

const MAX_LENGTH = 1000

/** 确认评论目标是存在且公开的内容 */
async function assertTargetExists(targetType: TargetType, targetId: string): Promise<void> {
  if (targetType === 'project') {
    const [row] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, targetId), eq(projects.status, 'published')))
      .limit(1)
    if (!row) throw createError({ statusCode: 404, statusMessage: '项目不存在或尚未公开' })
    return
  }

  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, targetId), eq(posts.status, 'published')))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: '文章不存在或尚未发布' })
}

export async function listCommentsFor(targetType: TargetType, targetId: string): Promise<CommentItem[]> {
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
      eq(comments.targetType, targetType),
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

export interface CreateCommentInput {
  targetType: TargetType
  targetId: string
  content: string
  parentId?: string | null
}

export async function createComment(user: SessionUser, input: CreateCommentInput) {
  const content = input.content.trim()
  if (!content) throw createError({ statusCode: 400, statusMessage: '评论内容不能为空' })
  if (content.length > MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `评论最多 ${MAX_LENGTH} 个字` })
  }

  await assertTargetExists(input.targetType, input.targetId)

  // 只支持两级：回复二级评论时，挂到同一个根评论下
  let parentId: string | null = null
  let rootId: string | null = null
  let replyToUserId: string | null = null

  if (input.parentId) {
    const [parent] = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        rootId: comments.rootId,
        status: comments.status,
      })
      .from(comments)
      .where(eq(comments.id, input.parentId))
      .limit(1)

    if (!parent || parent.status !== 'visible') {
      throw createError({ statusCode: 404, statusMessage: '要回复的评论不存在' })
    }

    parentId = parent.id
    rootId = parent.rootId ?? parent.id
    replyToUserId = parent.userId
  }

  const [row] = await db.insert(comments).values({
    targetType: input.targetType,
    targetId: input.targetId,
    userId: user.id,
    content,
    parentId,
    rootId,
    replyToUserId,
  }).returning({ id: comments.id, createdAt: comments.createdAt })

  if (input.targetType === 'project') {
    await refreshProjectCounters(input.targetId)
  }

  return {
    id: row!.id,
    createdAt: row!.createdAt.toISOString(),
  }
}

export async function deleteComment(user: SessionUser, commentId: string): Promise<void> {
  const [row] = await db
    .select({ id: comments.id, userId: comments.userId, targetType: comments.targetType, targetId: comments.targetId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '评论不存在' })
  }

  if (row.userId !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '只能删除自己的评论' })
  }

  await db.update(comments).set({ status: 'deleted' }).where(eq(comments.id, commentId))

  if (row.targetType === 'project') {
    await refreshProjectCounters(row.targetId)
  }
}

export async function listMyComments(userId: string) {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      status: comments.status,
      targetType: comments.targetType,
      targetId: comments.targetId,
    })
    .from(comments)
    .where(eq(comments.userId, userId))
    .orderBy(desc(comments.createdAt))
    .limit(100)

  const projectIds = rows.filter(row => row.targetType === 'project').map(row => row.targetId)
  const postIds = rows.filter(row => row.targetType === 'post').map(row => row.targetId)

  const projectMap = new Map<string, { title: string, slug: string }>()
  if (projectIds.length) {
    const projectRows = await db
      .select({ id: projects.id, title: projects.title, slug: projects.slug })
      .from(projects)
      .where(inArray(projects.id, projectIds))
    for (const row of projectRows) projectMap.set(row.id, { title: row.title, slug: row.slug })
  }

  const postMap = new Map<string, { title: string, slug: string }>()
  if (postIds.length) {
    const postRows = await db
      .select({ id: posts.id, title: posts.title, slug: posts.slug })
      .from(posts)
      .where(inArray(posts.id, postIds))
    for (const row of postRows) postMap.set(row.id, { title: row.title, slug: row.slug })
  }

  return rows.map((row) => {
    const target = row.targetType === 'project'
      ? projectMap.get(row.targetId)
      : postMap.get(row.targetId)

    return {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      status: row.status,
      targetType: row.targetType,
      targetSlug: target?.slug ?? null,
      targetTitle: target?.title ?? null,
    }
  })
}
