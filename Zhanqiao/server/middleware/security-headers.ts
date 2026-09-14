/**
 * 统一的安全响应头。
 * 站点是 UGC 内容站，这些头能挡掉最常见的几类攻击与信息泄露。
 */
export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl || '')

  // 防止浏览器把响应内容猜成别的类型（例如把上传的图片当脚本执行）
  setResponseHeader(event, 'x-content-type-options', 'nosniff')
  // 不允许被其他站点用 iframe 嵌套，避免点击劫持
  setResponseHeader(event, 'x-frame-options', 'SAMEORIGIN')
  // 跨站请求时不泄露完整来源地址
  setResponseHeader(event, 'referrer-policy', 'strict-origin-when-cross-origin')
  // 本站不需要这些硬件能力，直接关掉
  setResponseHeader(event, 'permissions-policy', 'geolocation=(), microphone=(), camera=()')

  // 仅在使用 HTTPS 时启用 HSTS，避免备案前用 IP+HTTP 访问时被浏览器强制升级
  if (siteUrl.startsWith('https://')) {
    setResponseHeader(event, 'strict-transport-security', 'max-age=15552000; includeSubDomains')
  }
})
