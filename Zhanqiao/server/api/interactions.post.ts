import { z } from 'zod'
import { requireUser } from '../utils/auth.ts'
import { toggleFavorite, toggleLike } from '../utils/interactions.ts'
import { checkRateLimit } from '../utils/rate-limit.ts'
import { readBodyAs } from '../utils/validate.ts'

const bodySchema = z.object({
  action: z.enum(['like', 'favorite']),
  targetId: z.string().uuid('目标标识不正确'),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  checkRateLimit(`interaction:${user.id}`, 120, 10 * 60 * 1000)

  const body = await readBodyAs(event, bodySchema)
  const targetType = getQuery(event).targetType === 'post' ? 'post' : 'project'

  if (body.action === 'like') {
    return toggleLike(user.id, targetType, body.targetId)
  }

  return toggleFavorite(user.id, body.targetId)
})
