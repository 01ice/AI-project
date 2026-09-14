import { z } from 'zod'
import { requireVerifiedUser } from '../utils/auth.ts'
import { createComment } from '../utils/comments.ts'
import { checkRateLimit } from '../utils/rate-limit.ts'
import { readBodyAs } from '../utils/validate.ts'

const bodySchema = z.object({
  targetType: z.enum(['project', 'post']),
  targetId: z.string().uuid('目标标识不正确'),
  content: z.string().trim().min(1, '评论内容不能为空').max(1000, '评论最多 1000 个字'),
  parentId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireVerifiedUser(event)
  checkRateLimit(`comment:${user.id}`, 20, 10 * 60 * 1000)

  const body = await readBodyAs(event, bodySchema)
  return createComment(user, body)
})
