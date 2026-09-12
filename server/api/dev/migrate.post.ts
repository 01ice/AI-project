/**
 * 开发环境专用：只应用数据库迁移，不清数据。
 * PGlite 是单进程数据库，另开终端跑脚本会和开发服务器抢文件锁。
 */
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const { getDbHandle } = await import('../../db/client.ts')
  const { ensureMigrations } = await import('../../db/migrate.ts')

  const applied = await ensureMigrations(getDbHandle())
  return { ok: true, applied }
})
