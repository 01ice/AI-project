import { getCurrentUser } from '../../utils/auth.ts'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  return { user }
})
