import { z } from 'zod'
import { requireUser } from '../utils/auth.ts'
import { checkRateLimit } from '../utils/rate-limit.ts'
import { REPORT_REASONS, createReport } from '../utils/reports.ts'
import { readBodyAs } from '../utils/validate.ts'

const bodySchema = z.object({
  targetType: z.enum(['project', 'post']),
  targetId: z.string().uuid('目标标识不正确'),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  checkRateLimit(`report:${user.id}`, 10, 60 * 60 * 1000)

  const body = await readBodyAs(event, bodySchema)
  return createReport(user.id, body)
})
