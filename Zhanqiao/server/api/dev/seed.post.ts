/**
 * 开发环境专用：在运行中的开发服务器里重灌示例数据。
 * PGlite 是文件型数据库，同一时刻只能被一个进程打开，因此不能另开进程跑脚本。
 */
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const { getDbHandle } = await import('../../db/client.ts')
  const { runMigrations } = await import('../../db/migrate.ts')
  const { seedDatabase } = await import('../../db/seed.ts')

  const handle = getDbHandle()
  const migrations = await runMigrations(handle)
  const result = await seedDatabase(handle)

  return { ok: true, migrations, ...result }
})
