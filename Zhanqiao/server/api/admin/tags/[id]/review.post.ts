import { z } from 'zod'
import { reviewTag } from '../../../../utils/admin.ts'
import { requireAdmin } from '../../../../utils/auth.ts'
import { readBodyAs } from '../../../../utils/validate.ts'

const bodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(300).default(''),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少标签标识' })
  }

  const body = await readBodyAs(event, bodySchema)
  return reviewTag(admin.id, id, body.action, body.note)
})
