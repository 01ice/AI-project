import { getProjectBySlug, incrementProjectViews } from '../../utils/projects.ts'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少项目标识' })
  }

  const project = await getProjectBySlug(slug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在或尚未公开' })
  }

  // 浏览量统计失败不应影响页面渲染
  incrementProjectViews(project.id).catch(() => {})

  // 评论改由 /api/comments 提供，便于项目与文章共用同一套评论逻辑
  return { project }
})
