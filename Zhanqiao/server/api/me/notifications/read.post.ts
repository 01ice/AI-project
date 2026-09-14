import { z } from 'zod'
import { requireUser } from '../../../utils/auth.ts'
import { markNotificationsRead } from '../../../utils/notify.ts'
import { readBodyAs } from '../../../utils/validate.ts'

const bodySchema = z.object({
  id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBodyAs(event, bodySchema)

  const updated = await markNotificationsRead(user.id, body.id)
  return { ok: true, updated }
})
