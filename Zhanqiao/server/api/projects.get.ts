import { listProjects, type ListProjectsParams } from '../utils/projects.ts'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const sort = query.sort
  const params: ListProjectsParams = {
    category: typeof query.category === 'string' ? query.category : undefined,
    tag: typeof query.tag === 'string' ? query.tag : undefined,
    q: typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined,
    ai: query.ai === '1' || query.ai === 'true' ? true : undefined,
    withMetrics: query.withMetrics === '1' || query.withMetrics === 'true' ? true : undefined,
    sort: sort === 'hot' || sort === 'featured' || sort === 'profit' || sort === 'revenue' || sort === 'cost'
      ? sort
      : 'latest',
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 12,
  }

  return listProjects(params)
})
