import { createHash } from 'node:crypto'

/**
 * 生成项目封面占位图（SVG）。
 * 种子数据与未上传封面的项目使用它，避免依赖外部图片服务，也省服务器带宽。
 */
export default defineEventHandler((event) => {
  const raw = getRouterParam(event, 'slug') ?? 'zhanqiao'
  const slug = decodeURIComponent(raw).replace(/\.svg$/, '')

  const hash = createHash('md5').update(slug).digest()
  const hue = hash[0]! % 360
  const hue2 = (hue + 42) % 360
  const initial = (slug.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')[0] ?? '栈').toUpperCase()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="${initial}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 62% 46%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 58% 32%)"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <g opacity="0.16" fill="#ffffff">
    <circle cx="548" cy="60" r="120"/>
    <circle cx="96" cy="316" r="96"/>
  </g>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
        font-family="-apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif"
        font-size="132" font-weight="700" fill="#ffffff" opacity="0.92">${initial}</text>
</svg>`

  setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return svg
})
