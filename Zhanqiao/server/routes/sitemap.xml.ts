import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { posts, projects } from '../db/schema.ts'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface Entry {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')

  const projectRows = await db
    .select({ slug: projects.slug, updatedAt: projects.updatedAt })
    .from(projects)
    .where(eq(projects.status, 'published'))
    .orderBy(desc(projects.publishedAt))

  const postRows = await db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))

  const entries: Entry[] = [
    { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${siteUrl}/projects`, changefreq: 'daily', priority: '0.9' },
    { loc: `${siteUrl}/ranking`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${siteUrl}/blog`, changefreq: 'daily', priority: '0.9' },
    { loc: `${siteUrl}/about`, changefreq: 'monthly', priority: '0.3' },
    ...projectRows.map(row => ({
      loc: `${siteUrl}/projects/${row.slug}`,
      lastmod: row.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: '0.8',
    })),
    ...postRows.map(row => ({
      loc: `${siteUrl}/blog/${row.slug}`,
      lastmod: row.updatedAt.toISOString(),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`]
      if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`)
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`)
      if (entry.priority) parts.push(`    <priority>${entry.priority}</priority>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    }),
    '</urlset>',
    '',
  ].join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=1800')

  return body
})
