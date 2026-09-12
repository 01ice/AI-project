import { requireUser } from '../../../utils/auth.ts'
import { getManagedProject } from '../../../utils/project-write.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少项目标识' })
  }

  return { project: await getManagedProject(user, slug) }
})
