import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function uploadDir(): string {
  const config = useRuntimeConfig()
  return String(config.uploadDir || '') || path.join(process.cwd(), '.data', 'uploads')
}

/**
 * 提供上传的图片。
 * 生产环境 Nitro 只服务构建产物里的静态文件，运行时上传的图片必须由这个路由读取。
 * 后续把图片迁到 COS 后，这个路由基本不会再被访问。
 */
export default defineEventHandler(async (event) => {
  const segments = getRouterParam(event, 'path')
  if (!segments) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const baseDir = path.resolve(uploadDir())
  const target = path.resolve(baseDir, decodeURIComponent(segments))

  // 防目录穿越：解析后的路径必须仍在上传目录内
  if (!target.startsWith(`${baseDir}${path.sep}`)) {
    throw createError({ statusCode: 400, statusMessage: '路径不合法' })
  }

  const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()]
  if (!contentType) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  try {
    const info = await stat(target)
    if (!info.isFile()) throw new Error('not a file')
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: '图片不存在' })
  }

  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  setHeader(event, 'x-content-type-options', 'nosniff')

  return readFile(target)
})
