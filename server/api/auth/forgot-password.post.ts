import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { sendMail, siteUrl } from '../../utils/mail.ts'
import { generateToken } from '../../utils/password.ts'
import { checkRateLimit, clientIp } from '../../utils/rate-limit.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
})

const RESET_MINUTES = 30

export default defineEventHandler(async (event) => {
  checkRateLimit(`forgot:${clientIp(event)}`, 5, 10 * 60 * 1000)
  const { email } = await readBodyAs(event, bodySchema)

  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  // 无论邮箱是否存在都返回同样的结果，避免暴露注册情况
  if (!row || row.status === 'banned') {
    return { ok: true }
  }

  const token = generateToken(24)
  await db.update(users)
    .set({
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
    })
    .where(eq(users.id, row.id))

  const resetUrl = `${siteUrl()}/reset-password?token=${token}`
  const mail = await sendMail({
    to: email,
    subject: '重置你的栈桥密码',
    text: `有人请求重置这个邮箱对应的栈桥账号密码。\n\n请点击下面的链接设置新密码（${RESET_MINUTES} 分钟内有效）：\n${resetUrl}\n\n如果这不是你本人的操作，忽略这封邮件即可，你的密码不会改变。`,
  })

  return {
    ok: true,
    mailSent: mail.delivered,
    resetUrl: import.meta.dev ? resetUrl : undefined,
  }
})
