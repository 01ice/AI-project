import { adminSummary } from '../../utils/admin.ts'
import { requireAdmin } from '../../utils/auth.ts'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return adminSummary()
})
