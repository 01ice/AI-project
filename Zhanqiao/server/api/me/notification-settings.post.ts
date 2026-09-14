import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { requireUser } from '../../utils/auth.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  notifyByEmail: z.boolean(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { notifyByEmail } = await readBodyAs(event, bodySchema)

  await db.update(users).set({ notifyByEmail }).where(eq(users.id, user.id))

  return { ok: true, notifyByEmail }
})
