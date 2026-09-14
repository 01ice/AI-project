import { requireUser } from '../../utils/auth.ts'
import { listMyPosts } from '../../utils/post-write.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { items: await listMyPosts(user.id) }
})
