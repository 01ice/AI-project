/**
 * 开发环境专用：正常关闭数据库连接并退出进程。
 * 用于在不损坏 PGlite 数据目录的前提下重启开发服务器。
 */
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const { getDbHandle } = await import('../../db/client.ts')

  try {
    await getDbHandle().close()
    console.log('[db] 数据库已正常关闭，进程即将退出')
  }
  catch (error) {
    console.error('[db] 关闭失败：', error)
  }

  setTimeout(() => process.exit(0), 200)

  return { ok: true, message: '开发服务器正在退出，请重新执行 npm run dev' }
})
