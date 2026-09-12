import { searchAll } from '../utils/search.ts'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 60) : ''

  if (!q) {
    return { q: '', projects: [], posts: [] }
  }

  const result = await searchAll(q)
  return { q, ...result }
})
