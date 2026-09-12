import { and, desc, eq, inArray } from 'drizzle-orm'
import type { AdminReportItem, TargetType } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { posts, projects, reports, users } from '../db/schema.ts'
import { notifyAdmins, notifyUser } from './notify.ts'

export const REPORT_REASONS = ['spam', 'ad', 'abuse', 'wrong', 'other'] as const
export type ReportReason = typeof REPORT_REASONS[number]

const REASON_LABELS: Record<string, string> = {
  spam: '垃圾信息 / 刷屏',
  ad: '广告推广',
  abuse: '辱骂或不当内容',
  wrong: '信息错误 / 误导',
  other: '其他',
}

/** 举报目标当前叫什么、地址在哪 */
async function resolveTargetLabel(targetType: TargetType, targetId: string) {
  if (targetType === 'project') {
    const [row] = await db
      .select({ title: projects.title, slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, targetId))
      .limit(1)
    return {
      title: row?.title ?? '（内容已删除）',
      link: row ? `/projects/${row.slug}` : '/admin?tab=reports',
    }
  }

  const [row] = await db
    .select({ title: posts.title, slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, targetId))
    .limit(1)

  return {
    title: row?.title ?? '（内容已删除）',
    link: row ? `/blog/${row.slug}` : '/admin?tab=reports',
  }
}

export interface CreateReportInput {
  targetType: TargetType
  targetId: string
  reason: ReportReason
  detail?: string | null
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  const [existing] = await db
    .select({
      id: reports.id,
      reporterId: reports.reporterId,
      targetType: reports.targetType,
      targetId: reports.targetId,
    })
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

  // 通知所有管理员：有人举报了内容，否则举报只能靠管理员自己进后台翻
  const target = await resolveTargetLabel(input.targetType, input.targetId)
  const reasonLabel = REASON_LABELS[input.reason] ?? input.reason
  const [reporter] = await db
    .select({ nickname: users.nickname })
    .from(users)
    .where(eq(users.id, reporterId))
    .limit(1)

  await notifyAdmins({
    type: 'content_comment',
    title: `收到举报：${target.title}`,
    body: `${reporter?.nickname ?? '有用户'} 举报「${reasonLabel}」${input.detail ? `：${input.detail}` : ''}`,
    link: '/admin?tab=reports',
    email: {
      subject: `栈桥收到新举报：${target.title}`,
      text: `${reporter?.nickname ?? '有用户'} 举报了${input.targetType === 'project' ? '项目' : '文章'}《${target.title}》。\n原因：${reasonLabel}${input.detail ? `\n补充：${input.detail}` : ''}`,
    },
  })

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
    .select({
      id: reports.id,
      reporterId: reports.reporterId,
      targetType: reports.targetType,
      targetId: reports.targetId,
    })
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

  // 告知举报人处理结果，让举报有闭环
  const target = await resolveTargetLabel(existing.targetType, existing.targetId)
  const handled = action === 'resolve'

  await notifyUser({
    userId: existing.reporterId,
    type: 'content_comment',
    title: handled ? '你的举报已处理' : '你的举报复核结果',
    body: `针对《${target.title}》的举报，管理员${handled ? '已处理' : '核实后认为无需处理'}。`,
    link: target.link,
    email: {
      subject: handled ? '你的举报已处理' : '你的举报复核结果',
      text: `你举报的《${target.title}》，管理员${handled ? '已处理' : '核实后认为无需处理'}。感谢你帮助维护社区环境。`,
    },
  })

  return { id, status }
}

export async function countPendingReports(): Promise<number> {
  const rows = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.status, 'pending'))

  return rows.length
}
