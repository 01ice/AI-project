import type { TagItem } from '../../shared/types.ts'
import { listTags } from '../utils/projects.ts'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const limit = Math.min(100, Number(query.limit) || 30)
  const group = typeof query.group === 'string' ? query.group as TagItem['group'] : undefined
  return listTags(limit, group)
})
