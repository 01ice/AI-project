import { eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { requireUser } from '../../utils/auth.ts'
import { sendMail, siteUrl } from '../../utils/mail.ts'
import { generateToken } from '../../utils/password.ts'
import { checkRateLimit } from '../../utils/rate-limit.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  checkRateLimit(`resend:${user.id}`, 3, 10 * 60 * 1000)

  if (user.emailVerified) {
    throw createError({ statusCode: 400, statusMessage: '邮箱已经验证过了' })
  }

  const token = generateToken(24)
  await db.update(users)
    .set({
      emailVerifyToken: token,
      emailVerifyExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    })
    .where(eq(users.id, user.id))

  const verifyUrl = `${siteUrl()}/verify-email?token=${token}`
  const mail = await sendMail({
    to: user.email,
    subject: '验证你的栈桥邮箱',
    text: `请点击下面的链接完成邮箱验证（24 小时内有效）：\n${verifyUrl}`,
  })

  return { ok: true, mailSent: mail.delivered, verifyUrl: import.meta.dev ? verifyUrl : undefined }
})
