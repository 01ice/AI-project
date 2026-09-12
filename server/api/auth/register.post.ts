import { eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { createSession, toSessionUser } from '../../utils/auth.ts'
import { consumeEmailCode } from '../../utils/email-code.ts'
import { sendMail, siteUrl } from '../../utils/mail.ts'
import { generateToken, hashPassword } from '../../utils/password.ts'
import { checkRateLimit, clientIp } from '../../utils/rate-limit.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确').max(254),
  username: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9_-]{3,20}$/, '用户名需为 3-20 位小写字母、数字、下划线或连字符'),
  nickname: z.string().trim().min(1, '请填写昵称').max(16, '昵称最多 16 个字'),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码最多 72 位'),
  code: z.string().trim().regex(/^\d{6}$/, '请输入 6 位数字验证码').optional(),
})

const VERIFY_HOURS = 24

export default defineEventHandler(async (event) => {
  checkRateLimit(`register:${clientIp(event)}`, 5, 10 * 60 * 1000)
  const body = await readBodyAs(event, bodySchema)

  const [existing] = await db
    .select({ id: users.id, email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, body.email), eq(users.username, body.username)))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: existing.email === body.email ? '该邮箱已注册' : '该用户名已被占用',
    })
  }

  // 带验证码注册：邮箱在注册这一步就完成验证
  // 不带验证码：创建账号后发送验证链接（兼容旧流程与后台建号场景）
  if (body.code) {
    await consumeEmailCode(body.email, body.code, 'register')
  }

  const verifyToken = body.code ? null : generateToken(24)
  const [row] = await db.insert(users).values({
    email: body.email,
    username: body.username,
    nickname: body.nickname,
    passwordHash: await hashPassword(body.password),
    emailVerifiedAt: body.code ? new Date() : null,
    emailVerifyToken: verifyToken,
    emailVerifyExpiresAt: verifyToken ? new Date(Date.now() + VERIFY_HOURS * 3600 * 1000) : null,
  }).returning()

  let verifyUrl: string | undefined
  let mailSent = true

  if (verifyToken) {
    verifyUrl = `${siteUrl()}/verify-email?token=${verifyToken}`
    const mail = await sendMail({
      to: body.email,
      subject: '验证你的栈桥邮箱',
      text: `你好 ${body.nickname}：\n\n请点击下面的链接完成邮箱验证（${VERIFY_HOURS} 小时内有效）：\n${verifyUrl}\n\n完成验证后就可以在栈桥发布项目了。如果这不是你本人的操作，忽略这封邮件即可。`,
    })
    mailSent = mail.delivered
  }

  await createSession(event, row!.id, generateToken(32))

  return {
    user: toSessionUser(row!),
    mailSent,
    verifyUrl: import.meta.dev ? verifyUrl : undefined,
  }
})
