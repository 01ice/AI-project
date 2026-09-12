import { listTags } from '../utils/projects.ts'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const limit = Math.min(100, Number(query.limit) || 30)
  return listTags(limit)
})
