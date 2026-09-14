import { listReports } from '../../utils/reports.ts'
import { requireAdmin } from '../../utils/auth.ts'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const status = ['pending', 'resolved', 'dismissed'].includes(String(query.status))
    ? String(query.status)
    : 'pending'

  return { status, items: await listReports(status) }
})
