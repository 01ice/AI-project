import { listProjects, type ListProjectsParams } from '../utils/projects.ts'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const params: ListProjectsParams = {
    category: typeof query.category === 'string' ? query.category : undefined,
    tag: typeof query.tag === 'string' ? query.tag : undefined,
    q: typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined,
    ai: query.ai === '1' || query.ai === 'true' ? true : undefined,
    sort: query.sort === 'hot' || query.sort === 'featured' ? query.sort : 'latest',
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 12,
  }

  return listProjects(params)
})
