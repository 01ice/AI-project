import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { createSession, toSessionUser } from '../../utils/auth.ts'
import { generateToken, verifyPassword } from '../../utils/password.ts'
import { checkRateLimit, clientIp } from '../../utils/rate-limit.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)
  checkRateLimit(`login:${ip}`, 10, 10 * 60 * 1000)

  const body = await readBodyAs(event, bodySchema)

  const [row] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  if (!row || !(await verifyPassword(body.password, row.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: '邮箱或密码不正确' })
  }

  if (row.status === 'banned') {
    throw createError({ statusCode: 403, statusMessage: '该账号已被封禁' })
  }

  await createSession(event, row.id, generateToken(32))
  await db.update(users)
    .set({ lastLoginAt: new Date(), lastLoginIp: ip })
    .where(eq(users.id, row.id))

  return { user: toSessionUser(row) }
})
