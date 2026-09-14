import { z } from 'zod'
import { reviewPost } from '../../../../utils/admin-posts.ts'
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
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }

  const body = await readBodyAs(event, bodySchema)
  return reviewPost(admin.id, slug, body.action, body.note)
})
