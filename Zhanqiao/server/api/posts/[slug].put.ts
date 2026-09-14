import { requireUser } from '../../utils/auth.ts'
import { postInputSchema } from '../../utils/post-input.ts'
import { updatePost } from '../../utils/post-write.ts'
import { readBodyAs } from '../../utils/validate.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }

  const input = await readBodyAs(event, postInputSchema)

  if (input.status !== 'draft' && !user.emailVerified) {
    throw createError({ statusCode: 403, statusMessage: '请先完成邮箱验证再发表文章' })
  }

  if (input.status !== 'draft') {
    if (input.title.trim().length < 4) {
      throw createError({ statusCode: 400, statusMessage: '标题至少 4 个字' })
    }
    if (input.body.trim().length < 50) {
      throw createError({ statusCode: 400, statusMessage: '正文至少 50 个字，写点实在的内容吧' })
    }
  }

  return updatePost(user, slug, input)
})
