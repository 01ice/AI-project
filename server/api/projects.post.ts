import { requireVerifiedUser } from '../utils/auth.ts'
import { projectInputSchema } from '../utils/project-input.ts'
import { createProject } from '../utils/project-write.ts'
import { checkRateLimit } from '../utils/rate-limit.ts'
import { readBodyAs } from '../utils/validate.ts'

export default defineEventHandler(async (event) => {
  const user = await requireVerifiedUser(event)
  checkRateLimit(`project:create:${user.id}`, 10, 60 * 60 * 1000)

  const input = await readBodyAs(event, projectInputSchema)
  return createProject(user, input)
})
