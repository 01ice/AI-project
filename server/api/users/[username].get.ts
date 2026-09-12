import { getPublicProfile } from '../../utils/users.ts'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: '缺少用户名' })
  }

  const profile = await getPublicProfile(username)
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: '用户不存在' })
  }

  return { profile }
})
