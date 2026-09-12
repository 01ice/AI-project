import { and, eq, sql } from 'drizzle-orm'
import type { InteractionState, TargetType } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { comments, favorites, likes, projects } from '../db/schema.ts'

async function countLikes(targetType: TargetType, targetId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)))

  return row?.count ?? 0
}

async function countFavorites(targetId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(favorites)
    .where(eq(favorites.projectId, targetId))

  return row?.count ?? 0
}

export async function countComments(targetType: TargetType, targetId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(
      eq(comments.targetType, targetType),
      eq(comments.targetId, targetId),
      eq(comments.status, 'visible'),
    ))

  return row?.count ?? 0
}

/** 项目表里冗余了计数，方便列表页直接展示，这里保持一致 */
async function syncProjectCounters(projectId: string) {
  const [likeCount, favoriteCount, commentCount] = await Promise.all([
    countLikes('project', projectId),
    countFavorites(projectId),
    countComments('project', projectId),
  ])

  await db.update(projects)
    .set({ likeCount, favoriteCount, commentCount })
    .where(eq(projects.id, projectId))
}

export async function toggleLike(userId: string, targetType: TargetType, targetId: string) {
  const [existing] = await db
    .select({ userId: likes.userId })
    .from(likes)
    .where(and(
      eq(likes.userId, userId),
      eq(likes.targetType, targetType),
      eq(likes.targetId, targetId),
    ))
    .limit(1)

  if (existing) {
    await db.delete(likes).where(and(
      eq(likes.userId, userId),
      eq(likes.targetType, targetType),
      eq(likes.targetId, targetId),
    ))
  }
  else {
    await db.insert(likes).values({ userId, targetType, targetId })
  }

  const likeCount = await countLikes(targetType, targetId)
  if (targetType === 'project') await syncProjectCounters(targetId)

  return { liked: !existing, likeCount }
}

export async function toggleFavorite(userId: string, projectId: string) {
  const [existing] = await db
    .select({ userId: favorites.userId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.projectId, projectId)))
    .limit(1)

  if (existing) {
    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.projectId, projectId)))
  }
  else {
    await db.insert(favorites).values({ userId, projectId })
  }

  const favoriteCount = await countFavorites(projectId)
  await syncProjectCounters(projectId)

  return { favorited: !existing, favoriteCount }
}

export async function getInteractionState(
  userId: string | null,
  targetType: TargetType,
  targetId: string,
): Promise<InteractionState> {
  const [likeCount, commentCount] = await Promise.all([
    countLikes(targetType, targetId),
    countComments(targetType, targetId),
  ])

  let favorited = false
  let favoriteCount = 0

  if (targetType === 'project') {
    favoriteCount = await countFavorites(targetId)
    if (userId) {
      const [row] = await db
        .select({ userId: favorites.userId })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.projectId, targetId)))
        .limit(1)
      favorited = Boolean(row)
    }
  }

  let liked = false
  if (userId) {
    const [row] = await db
      .select({ userId: likes.userId })
      .from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.targetType, targetType),
        eq(likes.targetId, targetId),
      ))
      .limit(1)
    liked = Boolean(row)
  }

  return { liked, favorited, likeCount, favoriteCount, commentCount }
}

export async function refreshProjectCounters(projectId: string) {
  await syncProjectCounters(projectId)
}
