import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
])

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export interface SavedFile {
  url: string
  size: number
  type: string
}

/**
 * 保存上传的图片。
 *
 * 目前使用本地磁盘（public/uploads），开发与小流量够用。
 * 部署阶段会在这里接入腾讯云 COS：由于服务器带宽只有 4Mbps，
 * 正式上线前图片必须改由 COS + CDN 分发，届时只需替换本函数内部实现，
 * 返回的 url 契约保持不变。
 */
export async function saveUpload(data: Buffer, mimeType: string): Promise<SavedFile> {
  const ext = ALLOWED_TYPES.get(mimeType)
  if (!ext) {
    throw createError({ statusCode: 415, statusMessage: '只支持 JPG / PNG / WebP / GIF 图片' })
  }

  if (!data.length) {
    throw createError({ statusCode: 400, statusMessage: '文件内容为空' })
  }

  if (data.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '图片不能超过 5MB' })
  }

  const config = useRuntimeConfig()
  const baseDir = String(config.uploadDir || '') || path.join(process.cwd(), 'public', 'uploads')
  const now = new Date()
  const relativeDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`
  const targetDir = path.join(baseDir, relativeDir)

  await mkdir(targetDir, { recursive: true })
  await writeFile(path.join(targetDir, fileName), data)

  return {
    url: `/uploads/${relativeDir}/${fileName}`,
    size: data.length,
    type: mimeType,
  }
}
