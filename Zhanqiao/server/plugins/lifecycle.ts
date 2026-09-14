import { getDbHandle } from '../db/client.ts'

/**
 * 进程退出时关闭数据库连接。
 * PGlite 是文件型数据库，如果进程被强杀，数据目录可能损坏；
 * 有了这个钩子，Nuxt 重启（配置变更触发）会走正常关闭流程。
 */
export default defineNitroPlugin(() => {
  let closing = false

  const shutdown = (signal: string) => {
    if (closing) return
    closing = true
    console.log(`[db] 收到 ${signal}，正在关闭数据库连接…`)
    getDbHandle().close().catch(error => console.error('[db] 关闭失败：', error))
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('beforeExit', () => shutdown('beforeExit'))
})
