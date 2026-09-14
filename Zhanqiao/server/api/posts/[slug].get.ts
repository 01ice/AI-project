import { getPostBySlug, incrementPostViews } from '../../utils/posts.ts'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }

  const post = await getPostBySlug(slug)
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在或尚未发布' })
  }

  incrementPostViews(post.id).catch(() => {})

  return { post }
})
