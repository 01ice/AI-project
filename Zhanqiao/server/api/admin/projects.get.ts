import type { ProjectStatus } from '../../../shared/types.ts'
import { listProjectsForReview } from '../../utils/admin.ts'
import { requireAdmin } from '../../utils/auth.ts'

const ALLOWED: ProjectStatus[] = ['pending', 'published', 'rejected', 'draft', 'offline']

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const status = ALLOWED.includes(query.status as ProjectStatus)
    ? query.status as ProjectStatus
    : 'pending'

  return { status, items: await listProjectsForReview(status) }
})
