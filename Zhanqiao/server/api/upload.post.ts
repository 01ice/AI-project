import { requireUser } from '../utils/auth.ts'
import { checkRateLimit } from '../utils/rate-limit.ts'
import { saveUpload } from '../utils/storage.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  checkRateLimit(`upload:${user.id}`, 60, 10 * 60 * 1000)

  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file' && part.filename && part.data?.length)

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: '没有收到图片文件' })
  }

  return saveUpload(Buffer.from(file.data), file.type ?? '')
})
