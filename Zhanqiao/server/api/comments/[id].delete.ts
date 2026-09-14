import { requireUser } from '../../utils/auth.ts'
import { deleteComment } from '../../utils/comments.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少评论标识' })
  }

  await deleteComment(user, id)
  return { ok: true }
})
