import { destroyCurrentSession } from '../../utils/auth.ts'

export default defineEventHandler(async (event) => {
  await destroyCurrentSession(event)
  return { ok: true }
})
