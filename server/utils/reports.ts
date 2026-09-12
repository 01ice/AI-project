import { and, desc, eq, inArray } from 'drizzle-orm'
import type { AdminReportItem, TargetType } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { posts, projects, reports, users } from '../db/schema.ts'

export const REPORT_REASONS = ['spam', 'ad', 'abuse', 'wrong', 'other'] as const
export type ReportReason = typeof REPORT_REASONS[number]

export interface CreateReportInput {
  targetType: TargetType
  targetId: string
  reason: ReportReason
  detail?: string | null
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(
      eq(reports.reporterId, reporterId),
      eq(reports.targetType, input.targetType),
      eq(reports.targetId, input.targetId),
      eq(reports.status, 'pending'),
    ))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '你已经举报过这条内容，我们正在处理' })
  }

  const [row] = await db.insert(reports).values({
    reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    detail: input.detail?.trim().slice(0, 500) || null,
  }).returning({ id: reports.id })

  return { id: row!.id }
}

export async function listReports(status: string, limit = 50): Promise<AdminReportItem[]> {
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      detail: reports.detail,
      status: reports.status,
      createdAt: reports.createdAt,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reporterName: users.nickname,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(eq(reports.status, status as 'pending' | 'resolved' | 'dismissed'))
    .orderBy(desc(reports.createdAt))
    .limit(limit)

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
      reason: row.reason,
      detail: row.detail,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      targetType: row.targetType,
      targetSlug: target?.slug ?? null,
      targetTitle: target?.title ?? null,
      reporterName: row.reporterName,
    }
  })
}

export async function reviewReport(
  adminId: string,
  id: string,
  action: 'resolve' | 'dismiss',
): Promise<{ id: string, status: string }> {
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '举报记录不存在' })
  }

  const status = action === 'resolve' ? 'resolved' : 'dismissed'

  await db.update(reports).set({
    status,
    handledBy: adminId,
    handledAt: new Date(),
  }).where(eq(reports.id, id))

  return { id, status }
}

export async function countPendingReports(): Promise<number> {
  const rows = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.status, 'pending'))

  return rows.length
}
