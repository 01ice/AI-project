import { desc } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'

/**
 * 开发环境专用：查看最近生成的验证与重置链接，方便本地走通邮件流程。
 * 生产环境返回 404。
 */
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const rows = await db
    .select({
      email: users.email,
      username: users.username,
      emailVerified: users.emailVerifiedAt,
      emailVerifyToken: users.emailVerifyToken,
      passwordResetToken: users.passwordResetToken,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5)

  return { items: rows }
})
