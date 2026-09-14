import { z } from 'zod'
import { sendMail } from '../../utils/mail.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  to: z.string().trim().email('邮箱格式不正确'),
})

/** 开发环境专用：测试发信并返回失败原因，便于排查 SMTP 配置 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const { to } = await readBodyAs(event, bodySchema)

  const result = await sendMail({
    to,
    subject: '栈桥 · 发信测试',
    text: '如果你收到这封邮件，说明栈桥的 SMTP 配置已经生效。',
  })

  return result
})
