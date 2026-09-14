/**
 * 开发环境专用：查看关键配置是否已加载（只返回布尔值，不泄露任何密钥）。
 * 排查「.env 改了但没生效」这类问题时很有用。
 */
export default defineEventHandler(() => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const config = useRuntimeConfig()

  return {
    smtp: {
      host: String(config.smtpHost ?? ''),
      port: String(config.smtpPort ?? ''),
      userConfigured: Boolean(config.smtpUser),
      passConfigured: Boolean(config.smtpPass),
      passLength: String(config.smtpPass ?? '').length,
      ready: Boolean(config.smtpUser && config.smtpPass),
    },
    deepseek: { configured: Boolean(config.deepseekApiKey) },
    cos: { configured: Boolean(config.cosBucket && config.cosSecretId) },
    siteUrl: String(config.public.siteUrl ?? ''),
    databaseDriver: process.env.NUXT_DATABASE_URL ? 'postgres' : 'pglite',
  }
})
