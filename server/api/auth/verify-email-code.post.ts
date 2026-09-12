import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { requireUser, toSessionUser } from '../../utils/auth.ts'
import { consumeEmailCode } from '../../utils/email-code.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '请输入 6 位数字验证码'),
})

/** 已登录用户用验证码完成邮箱验证 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { code } = await readBodyAs(event, bodySchema)

  if (user.emailVerified) {
    throw createError({ statusCode: 400, statusMessage: '邮箱已经验证过了' })
  }

  await consumeEmailCode(user.email, code, 'register')

  const [updated] = await db.update(users)
    .set({ emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyExpiresAt: null })
    .where(eq(users.id, user.id))
    .returning()

  return { ok: true, user: toSessionUser(updated!) }
})
