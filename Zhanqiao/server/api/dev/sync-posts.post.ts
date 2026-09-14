import { syncPostsFromDisk } from '../../db/posts-sync.ts'

/** 开发环境专用：把 content/posts 下的 Markdown 同步进数据库 */
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return syncPostsFromDisk({ log: true })
})
