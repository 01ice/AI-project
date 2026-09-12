import type { TargetType } from '../../shared/types.ts'
import { getCurrentUser } from '../utils/auth.ts'
import { getInteractionState } from '../utils/interactions.ts'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetType: TargetType = query.targetType === 'post' ? 'post' : 'project'
  const targetId = typeof query.targetId === 'string' ? query.targetId : ''

  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: '缺少目标标识' })
  }

  const user = await getCurrentUser(event)
  return getInteractionState(user?.id ?? null, targetType, targetId)
})
