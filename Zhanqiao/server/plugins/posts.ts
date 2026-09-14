import { watch } from 'node:fs'
import { contentDir, syncPostsFromDisk } from '../db/posts-sync.ts'

/**
 * 文章同步：启动时把 content/posts 下的 Markdown 导入数据库。
 * 开发环境额外监听文件变化，改完 Markdown 保存即生效。
 * 它必须排在 migrate 插件之后执行（文件名排序天然满足）。
 */
export default defineNitroPlugin(async () => {
  const autoMigrate = import.meta.dev || process.env.NUXT_AUTO_MIGRATE === '1'

  try {
    // 插件之间不保证先后顺序，这里先确保表结构存在，再做文章同步
    if (autoMigrate) {
      const { getDbHandle } = await import('../db/client.ts')
      const { ensureMigrations } = await import('../db/migrate.ts')
      await ensureMigrations(getDbHandle(), { log: false })
    }

    const result = await syncPostsFromDisk()
    if (result.upserted || result.removed || result.errors.length) {
      console.log(`[posts] 同步完成：更新 ${result.upserted} 篇，关联 ${result.relations} 条，移除 ${result.removed} 篇`)
      for (const error of result.errors) console.warn(`[posts] ${error}`)
    }
  }
  catch (error) {
    console.error('[posts] 同步失败：', error)
  }

  if (!import.meta.dev) return

  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    watch(contentDir(), { recursive: true }, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        syncPostsFromDisk({ log: true }).catch(error => console.error('[posts] 增量同步失败：', error))
      }, 300)
    })
  }
  catch {
    // 目录不存在时忽略
  }
})
