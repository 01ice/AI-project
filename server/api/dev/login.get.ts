import { eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { createSession } from '../../utils/auth.ts'
import { generateToken } from '../../utils/password.ts'

/**
 * 开发环境专用：用某个邮箱直接登录并跳转，方便在浏览器里预览需要登录的页面。
 * 生产环境返回 404。
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const query = getQuery(event)
  const email = String(query.email ?? '').trim().toLowerCase()
  const redirect = typeof query.redirect === 'string' && query.redirect.startsWith('/')
    ? query.redirect
    : '/me'

  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '该邮箱尚未注册' })
  }

  await createSession(event, row.id, generateToken(32))
  return sendRedirect(event, redirect)
})
