import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { posts } from '../db/schema.ts'
import { markdownToPlainText } from '../utils/markdown.ts'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')

  const rows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      body: posts.body,
      authorName: posts.authorName,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(30)

  const items = rows.map((row) => {
    const link = `${siteUrl}/blog/${row.slug}`
    const description = row.summary || markdownToPlainText(row.body, 160)
    const pubDate = (row.publishedAt ?? new Date()).toUTCString()

    return [
      '    <item>',
      `      <title>${escapeXml(row.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <description>${escapeXml(description)}</description>`,
      `      <author>${escapeXml(row.authorName)}</author>`,
      `      <pubDate>${pubDate}</pubDate>`,
      '    </item>',
    ].join('\n')
  })

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>栈桥 · 博客</title>',
    `    <link>${siteUrl}/blog</link>`,
    '    <description>AI 项目的成本复盘、技术选型与踩坑记录</description>',
    '    <language>zh-CN</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=1800')

  return body
})
