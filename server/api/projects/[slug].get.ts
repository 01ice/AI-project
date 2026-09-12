import { getProjectBySlug, incrementProjectViews, listComments } from '../../utils/projects.ts'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少项目标识' })
  }

  const project = await getProjectBySlug(slug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: '项目不存在或尚未公开' })
  }

  const comments = await listComments(project.id)

  // 浏览量统计失败不应影响页面渲染
  incrementProjectViews(project.id).catch(() => {})

  return { project, comments }
})
