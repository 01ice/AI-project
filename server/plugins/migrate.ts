/**
 * 开发环境启动时自动应用迁移，避免「改了 schema 还要停掉开发服务器手动跑迁移」的麻烦。
 * 线上默认不自动迁移，需要显式设置 NUXT_AUTO_MIGRATE=1。
 */
export default defineNitroPlugin(async () => {
  const autoMigrate = import.meta.dev || process.env.NUXT_AUTO_MIGRATE === '1'
  if (!autoMigrate) return

  try {
    const { getDbHandle } = await import('../db/client.ts')
    const { ensureMigrations } = await import('../db/migrate.ts')
    const applied = await ensureMigrations(getDbHandle())
    if (applied.length) {
      console.log(`[db] 已自动应用 ${applied.length} 个迁移`)
    }
  }
  catch (error) {
    console.error('[db] 自动迁移失败，请检查数据库状态：', error)
  }
})
