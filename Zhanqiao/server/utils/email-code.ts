import { createHash, randomInt } from 'node:crypto'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { emailCodes } from '../db/schema.ts'
import { sendMail } from './mail.ts'
import { checkRateLimit } from './rate-limit.ts'

const CODE_MINUTES = 10
const MAX_ATTEMPTS = 5
const RESEND_SECONDS = 60

export type EmailCodePurpose = 'register' | 'reset_password'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export interface IssueResult {
  delivered: boolean
  expiresInMinutes: number
  /** 仅开发环境返回，便于本地调试 */
  devCode?: string
}

export async function issueEmailCode(
  email: string,
  purpose: EmailCodePurpose,
  ip: string,
): Promise<IssueResult> {
  const [recent] = await db
    .select({ createdAt: emailCodes.createdAt })
    .from(emailCodes)
    .where(and(eq(emailCodes.email, email), eq(emailCodes.purpose, purpose)))
    .orderBy(desc(emailCodes.createdAt))
    .limit(1)

  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_SECONDS * 1000) {
    throw createError({ statusCode: 429, statusMessage: '验证码刚发送过，请稍后再试' })
  }

  checkRateLimit(`code:${purpose}:${email}`, 5, 60 * 60 * 1000)
  checkRateLimit(`code-ip:${ip}`, 30, 60 * 60 * 1000)

  const code = String(randomInt(100_000, 1_000_000))

  await db.insert(emailCodes).values({
    email,
    purpose,
    codeHash: hashCode(code),
    ip,
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
  })

  const isRegister = purpose === 'register'
  const mail = await sendMail({
    to: email,
    subject: isRegister ? '栈桥注册验证码' : '栈桥密码重置验证码',
    text: `你的${isRegister ? '注册' : '密码重置'}验证码是：${code}\n\n${CODE_MINUTES} 分钟内有效，请勿把验证码告诉任何人。如果不是你本人的操作，忽略这封邮件即可。`,
  })

  return {
    delivered: mail.delivered,
    expiresInMinutes: CODE_MINUTES,
    devCode: import.meta.dev ? code : undefined,
  }
}

/** 校验并消费验证码，失败会抛错 */
export async function consumeEmailCode(
  email: string,
  code: string,
  purpose: EmailCodePurpose,
): Promise<void> {
  const [row] = await db
    .select()
    .from(emailCodes)
    .where(and(
      eq(emailCodes.email, email),
      eq(emailCodes.purpose, purpose),
      isNull(emailCodes.consumedAt),
      gt(emailCodes.expiresAt, new Date()),
    ))
    .orderBy(desc(emailCodes.createdAt))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 400, statusMessage: '验证码已过期，请重新获取' })
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: '输错次数过多，请重新获取验证码' })
  }

  if (row.codeHash !== hashCode(code)) {
    await db.update(emailCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(emailCodes.id, row.id))
    throw createError({ statusCode: 400, statusMessage: '验证码不正确' })
  }

  await db.update(emailCodes)
    .set({ consumedAt: new Date() })
    .where(eq(emailCodes.id, row.id))
}
