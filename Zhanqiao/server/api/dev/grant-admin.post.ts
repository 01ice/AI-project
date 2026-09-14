import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
})

/**
 * 开发环境专用：把某个账号提升为管理员。
 * 本地 PGlite 同时只能被开发服务器占用，所以不方便另开终端跑脚本。
 * 服务器上请用 npm run user:create -- --admin。
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const { email } = await readBodyAs(event, bodySchema)

  const [row] = await db.update(users)
    .set({ role: 'admin', emailVerifiedAt: new Date() })
    .where(eq(users.email, email))
    .returning({ username: users.username, email: users.email, role: users.role })

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '该邮箱尚未注册' })
  }

  return { ok: true, user: row }
})
