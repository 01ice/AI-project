import { requireUser } from '../../utils/auth.ts'
import { listMyComments } from '../../utils/comments.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { items: await listMyComments(user.id) }
})
