import { requireVerifiedUser } from '../../utils/auth.ts'
import { projectInputSchema } from '../../utils/project-input.ts'
import { updateProject } from '../../utils/project-write.ts'
import { readBodyAs } from '../../utils/validate.ts'

export default defineEventHandler(async (event) => {
  const user = await requireVerifiedUser(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少项目标识' })
  }

  const input = await readBodyAs(event, projectInputSchema)
  return updateProject(user, slug, input)
})
