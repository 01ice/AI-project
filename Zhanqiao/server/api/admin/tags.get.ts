import { listTagsForReview } from '../../utils/admin.ts'
import { requireAdmin } from '../../utils/auth.ts'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const status = ['pending', 'approved', 'rejected'].includes(String(query.status))
    ? String(query.status)
    : 'pending'

  return { status, items: await listTagsForReview(status) }
})
