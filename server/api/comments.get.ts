import type { TargetType } from '../../shared/types.ts'
import { listCommentsFor } from '../utils/comments.ts'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetType: TargetType = query.targetType === 'post' ? 'post' : 'project'
  const targetId = typeof query.targetId === 'string' ? query.targetId : ''

  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: '缺少目标标识' })
  }

  return { items: await listCommentsFor(targetType, targetId) }
})
