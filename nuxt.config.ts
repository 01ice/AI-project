import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: '栈桥 · 发现开发者的项目',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: '栈桥是一个面向中文开发者的项目收录与分享社区，发现好项目，也分享你自己的作品。',
        },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: '',
    smtpHost: 'smtp.qq.com',
    smtpPort: '465',
    smtpUser: '',
    smtpPass: '',
    deepseekApiKey: '',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },
})
