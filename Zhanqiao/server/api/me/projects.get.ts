import { requireUser } from '../../utils/auth.ts'
import { listMyProjects } from '../../utils/project-write.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { items: await listMyProjects(user.id) }
})
