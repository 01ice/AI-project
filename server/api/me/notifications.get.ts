import { requireUser } from '../../utils/auth.ts'
import { listNotifications } from '../../utils/notify.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const limit = Math.min(100, Number(query.limit) || 50)

  return listNotifications(user.id, limit)
})
