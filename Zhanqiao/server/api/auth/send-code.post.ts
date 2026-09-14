import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { issueEmailCode } from '../../utils/email-code.ts'
import { clientIp } from '../../utils/rate-limit.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确').max(254),
})

export default defineEventHandler(async (event) => {
  const { email } = await readBodyAs(event, bodySchema)

  const [existing] = await db
    .select({ id: users.id, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // 已注册且已验证：没必要发码；已注册但未验证：发的就是验证邮箱的验证码
  if (existing?.emailVerifiedAt) {
    throw createError({ statusCode: 409, statusMessage: '该邮箱已经注册过了，可以直接登录' })
  }

  const result = await issueEmailCode(email, 'register', clientIp(event))
  return { ok: true, ...result }
})
