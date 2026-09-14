import { z } from 'zod'
import { requireAdmin } from '../../../../utils/auth.ts'
import { reviewReport } from '../../../../utils/reports.ts'
import { readBodyAs } from '../../../../utils/validate.ts'

const bodySchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少举报标识' })
  }

  const body = await readBodyAs(event, bodySchema)
  return reviewReport(admin.id, id, body.action)
})
