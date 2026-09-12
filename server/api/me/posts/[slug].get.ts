import { requireUser } from '../../../utils/auth.ts'
import { getManagedPost } from '../../../utils/post-write.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }

  return { post: await getManagedPost(user, slug) }
})
