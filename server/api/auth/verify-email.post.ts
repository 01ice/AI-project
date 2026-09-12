import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { getCurrentUser, toSessionUser } from '../../utils/auth.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  token: z.string().trim().min(10, '验证链接不完整'),
})

export default defineEventHandler(async (event) => {
  const { token } = await readBodyAs(event, bodySchema)

  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.emailVerifyToken, token), gt(users.emailVerifyExpiresAt, new Date())))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 400, statusMessage: '验证链接无效或已过期' })
  }

  const [updated] = await db.update(users)
    .set({ emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyExpiresAt: null })
    .where(eq(users.id, row.id))
    .returning()

  const current = await getCurrentUser(event)

  return {
    ok: true,
    user: current?.id === updated!.id ? toSessionUser(updated!) : undefined,
  }
})
