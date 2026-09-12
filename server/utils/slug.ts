import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { projects, tags } from '../db/schema.ts'

/** 只保留 ASCII 字母数字，中文标题会退化为随机短标识 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function randomSlug(prefix = 'p'): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`
}

export async function uniqueProjectSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title)
  let candidate = base.length >= 3 ? base.slice(0, 48) : randomSlug()

  for (let i = 0; i < 20; i += 1) {
    const [row] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, candidate))
      .limit(1)

    if (!row || row.id === excludeId) return candidate
    candidate = `${base.slice(0, 40) || 'p'}-${i + 2}`
  }

  return randomSlug()
}

export async function uniqueTagSlug(name: string, fallbackPrefix = 'tag'): Promise<string> {
  const base = slugify(name)
  let candidate = base.length >= 2 ? base.slice(0, 28) : randomSlug(fallbackPrefix)

  for (let i = 0; i < 20; i += 1) {
    const [row] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, candidate))
      .limit(1)

    if (!row) return candidate
    candidate = `${base.slice(0, 20) || fallbackPrefix}-${i + 2}`
  }

  return randomSlug(fallbackPrefix)
}
