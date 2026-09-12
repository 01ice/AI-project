import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { NotificationType } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { notifications, users } from '../db/schema.ts'
import { sendMail, siteUrl } from './mail.ts'

export interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
  /** 需要同时发邮件时传入；会尊重用户的邮件开关 */
  email?: { subject: string, text: string } | null
}

/**
 * 创建站内通知，并按需发送邮件。
 * 通知失败不应该影响主流程（例如审核本身），所以这里不向外抛错。
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 120),
      body: input.body?.slice(0, 300) ?? null,
      link: input.link?.slice(0, 200) ?? null,
    })

    if (!input.email) return

    const [user] = await db
      .select({ email: users.email, notifyByEmail: users.notifyByEmail })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)

    if (!user?.notifyByEmail) return

    const url = input.link ? `${siteUrl()}${input.link}` : siteUrl()
    await sendMail({
      to: user.email,
      subject: input.email.subject,
      text: `${input.email.text}\n\n${url}\n\n（可在个人中心的「我的通知」里关闭邮件提醒）`,
    })
  }
  catch (error) {
    console.error('[notify] 通知发送失败：', error)
  }
}

export async function listNotifications(userId: string, limit = 50) {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))

  return {
    items: rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
    unread: countRow?.count ?? 0,
  }
}

export async function markNotificationsRead(userId: string, id?: string): Promise<number> {
  const condition = id
    ? and(eq(notifications.userId, userId), eq(notifications.id, id), isNull(notifications.readAt))
    : and(eq(notifications.userId, userId), isNull(notifications.readAt))

  const rows = await db.update(notifications)
    .set({ readAt: new Date() })
    .where(condition)
    .returning({ id: notifications.id })

  return rows.length
}
