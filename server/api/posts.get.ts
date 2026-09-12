import { listPosts, type ListPostsParams } from '../utils/posts.ts'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  const params: ListPostsParams = {
    tag: typeof query.tag === 'string' && query.tag ? query.tag : undefined,
    q: typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 10,
  }

  return listPosts(params)
})
