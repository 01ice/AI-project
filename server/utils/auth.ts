import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import type { SessionUser } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { sessions, users } from '../db/schema.ts'
import { clientIp } from './rate-limit.ts'

const SESSION_COOKIE = 'zq_session'
const SESSION_DAYS = 30

function cookieOptions() {
  // 备案前用 http://IP:端口 访问，此时不能设置 secure，否则浏览器不会回传 Cookie
  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? ''
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: siteUrl.startsWith('https://'),
    maxAge: SESSION_DAYS * 24 * 3600,
  }
}

export function toSessionUser(row: {
  id: string
  username: string
  nickname: string
  email: string
  emailVerifiedAt: Date | null
  avatarUrl: string | null
  role: 'user' | 'admin'
}): SessionUser {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    emailVerified: row.emailVerifiedAt !== null,
    avatarUrl: row.avatarUrl,
    role: row.role,
  }
}

export async function createSession(event: H3Event, userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000)

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
    ip: clientIp(event),
    userAgent: (getRequestHeader(event, 'user-agent') ?? '').slice(0, 300),
  })

  setCookie(event, SESSION_COOKIE, token, cookieOptions())
}

export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      nickname: users.nickname,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      avatarUrl: users.avatarUrl,
      role: users.role,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1)

  if (!row || row.status === 'banned') return null
  return toSessionUser(row)
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }
  return user
}

/** 发布项目等操作要求邮箱已验证 */
export async function requireVerifiedUser(event: H3Event): Promise<SessionUser> {
  const user = await requireUser(event)
  if (!user.emailVerified) {
    throw createError({ statusCode: 403, statusMessage: '请先完成邮箱验证' })
  }
  return user
}

export async function destroyCurrentSession(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token))
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
