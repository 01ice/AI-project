import { requireUser } from '../../utils/auth.ts'
import { issueEmailCode } from '../../utils/email-code.ts'
import { checkRateLimit, clientIp } from '../../utils/rate-limit.ts'

/** 给已登录但未验证邮箱的用户重新发送 6 位验证码 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  checkRateLimit(`resend:${user.id}`, 5, 10 * 60 * 1000)

  if (user.emailVerified) {
    throw createError({ statusCode: 400, statusMessage: '邮箱已经验证过了' })
  }

  const result = await issueEmailCode(user.email, 'register', clientIp(event))

  return {
    ok: true,
    delivered: result.delivered,
    devCode: result.devCode,
    expiresInMinutes: result.expiresInMinutes,
  }
})
