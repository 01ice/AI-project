import { z } from 'zod'
import { reviewProject } from '../../../../utils/admin.ts'
import { requireAdmin } from '../../../../utils/auth.ts'
import { readBodyAs } from '../../../../utils/validate.ts'

const bodySchema = z.object({
  action: z.enum(['approve', 'reject', 'offline']),
  note: z.string().trim().max(500).default(''),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少项目标识' })
  }

  const body = await readBodyAs(event, bodySchema)
  return reviewProject(admin.id, slug, body.action, body.note)
})
