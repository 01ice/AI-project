import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { destroyAllSessions } from '../../utils/auth.ts'
import { hashPassword } from '../../utils/password.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  token: z.string().trim().min(10, '重置链接不完整'),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码最多 72 位'),
})

export default defineEventHandler(async (event) => {
  const body = await readBodyAs(event, bodySchema)

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.passwordResetToken, body.token),
      gt(users.passwordResetExpiresAt, new Date()),
    ))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 400, statusMessage: '重置链接无效或已过期' })
  }

  await db.update(users)
    .set({
      passwordHash: await hashPassword(body.password),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(users.id, row.id))

  // 密码变更后强制所有设备重新登录
  await destroyAllSessions(row.id)

  return { ok: true }
})
