import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import COS from 'cos-nodejs-sdk-v5'

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

interface CosConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
  publicBaseUrl: string
}

/** 读取 COS 配置；没有配置齐全就返回 null，退回本地磁盘存储 */
export function cosConfig(): CosConfig | null {
  const config = useRuntimeConfig()
  const secretId = String(config.cosSecretId ?? '')
  const secretKey = String(config.cosSecretKey ?? '')
  const bucket = String(config.cosBucket ?? '')
  const region = String(config.cosRegion ?? '')

  if (!secretId || !secretKey || !bucket || !region) return null

  const base = String(config.cosPublicBaseUrl ?? '').replace(/\/$/, '')
    || `https://${bucket}.cos.${region}.myqcloud.com`

  return { secretId, secretKey, bucket, region, publicBaseUrl: base }
}

let cosClient: COS | null = null
let cosClientKey = ''

function getCosClient(config: CosConfig): COS {
  const key = `${config.secretId}:${config.bucket}:${config.region}`
  if (!cosClient || cosClientKey !== key) {
    cosClient = new COS({ SecretId: config.secretId, SecretKey: config.secretKey })
    cosClientKey = key
  }
  return cosClient
}

/**
 * 保存上传的图片。
 *
 * 配置了 COS 就上传到对象存储（服务器带宽只有 4Mbps，图片必须走对象存储）；
 * 没配置时退回服务器本地磁盘，方便本地开发。
 * 两种方式返回的 url 契约一致，页面上无需区分。
 */
/** 校验文件头，避免把改了后缀的任意文件当成图片存进来 */
function matchesImageSignature(data: Buffer, mimeType: string): boolean {
  if (data.length < 12) return false

  switch (mimeType) {
    case 'image/jpeg':
      return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
    case 'image/png':
      return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    case 'image/gif':
      return data.subarray(0, 4).toString('ascii') === 'GIF8'
    case 'image/webp':
      return data.subarray(0, 4).toString('ascii') === 'RIFF'
        && data.subarray(8, 12).toString('ascii') === 'WEBP'
    default:
      return false
  }
}

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

  // 浏览器传来的 MIME 可以被伪造，这里再按文件头确认一次
  if (!matchesImageSignature(data, mimeType)) {
    throw createError({ statusCode: 415, statusMessage: '文件内容不是有效的图片' })
  }

  const now = new Date()
  const relativeDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`
  const key = `uploads/${relativeDir}/${fileName}`

  const cos = cosConfig()
  if (cos) {
    try {
      await new Promise<void>((resolve, reject) => {
        getCosClient(cos).putObject({
          Bucket: cos.bucket,
          Region: cos.region,
          Key: key,
          Body: data,
          ContentType: mimeType,
        }, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      return {
        url: `${cos.publicBaseUrl}/${key}`,
        size: data.length,
        type: mimeType,
      }
    }
    catch (error) {
      // 对象存储不可用时退回本地磁盘，保证上传不中断；日志里会留下明确原因
      console.error('[storage] COS 上传失败，已退回本地存储：', error)
    }
  }

  const config = useRuntimeConfig()
  // 不能用 public/uploads：生产环境只对外提供构建产物 .output/public 里的文件，
  // 运行时写进去的图片不会被服务（这正是图片打不开的原因）。
  // 上传目录放在构建产物之外，由 server/routes/uploads/[...path].ts 读取。
  const baseDir = String(config.uploadDir || '') || path.join(process.cwd(), '.data', 'uploads')
  const targetDir = path.join(baseDir, relativeDir)

  await mkdir(targetDir, { recursive: true })
  await writeFile(path.join(targetDir, fileName), data)

  return {
    url: `/uploads/${relativeDir}/${fileName}`,
    size: data.length,
    type: mimeType,
  }
}
