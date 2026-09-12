import { listPostsForReview } from '../../utils/admin-posts.ts'
import { requireAdmin } from '../../utils/auth.ts'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const status = ['pending', 'published', 'rejected', 'offline', 'draft'].includes(String(query.status))
    ? String(query.status)
    : 'pending'

  return { status, items: await listPostsForReview(status) }
})
