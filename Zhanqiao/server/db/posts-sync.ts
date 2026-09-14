import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import matter from 'gray-matter'
import { db } from './client.ts'
import { postProjects, posts, projects, users } from './schema.ts'

export interface SyncResult {
  scanned: number
  upserted: number
  skipped: number
  relations: number
  removed: number
  errors: string[]
}

export function contentDir(): string {
  return path.resolve(process.cwd(), 'content/posts')
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean).slice(0, 8)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,，]/).map(item => item.trim()).filter(Boolean).slice(0, 8)
  }
  return []
}

function normalizeSlugs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,，]/).map(item => item.trim()).filter(Boolean)
  }
  return []
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

/** 从正文里兜底提取摘要 */
function fallbackSummary(body: string): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}.*$/gm, ' ')
    .replace(/[*_`>#\-[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.slice(0, 120) || '（暂无摘要）'
}

/**
 * 把 content/posts 下的 Markdown 文章同步进数据库。
 *
 * 设计取舍：文章虽然以 Markdown 文件形式存仓库（方便 Git 投稿与评审），
 * 但同步进数据库后，才能和项目做多对多关联、参与联表查询与分页，
 * 将来加网页编辑器时也是写入同一张 posts 表。
 */
export async function syncPostsFromDisk(options: { log?: boolean } = {}): Promise<SyncResult> {
  const log = options.log ?? false
  const result: SyncResult = { scanned: 0, upserted: 0, skipped: 0, relations: 0, removed: 0, errors: [] }
  const dir = contentDir()

  let entries: string[] = []
  try {
    entries = (await readdir(dir, { recursive: true })) as string[]
  }
  catch {
    // 目录不存在时不做任何清理，避免误删数据
    return result
  }

  const files = entries
    .filter(name => name.endsWith('.md') && !path.basename(name).startsWith('_'))
    .map(name => name.split(path.sep).join('/'))
    .sort()

  const seenPaths = new Set<string>()
  const projectIdBySlug = new Map(
    (await db.select({ id: projects.id, slug: projects.slug }).from(projects))
      .map(row => [row.slug, row.id]),
  )
  const userByUsername = new Map(
    (await db.select({ id: users.id, username: users.username, nickname: users.nickname }).from(users))
      .map(row => [row.username, row]),
  )

  for (const relative of files) {
    const absolute = path.join(dir, relative)
    const sourcePath = `content/posts/${relative}`
    seenPaths.add(sourcePath)
    result.scanned += 1

    try {
      const raw = await readFile(absolute, 'utf8')
      const parsed = matter(raw)
      const data = parsed.data as Record<string, unknown>
      const body = parsed.content.trim()

      const slug = String(data.slug ?? path.basename(relative, '.md')).trim()
      const title = String(data.title ?? '').trim() || slug
      const summary = String(data.summary ?? '').trim() || fallbackSummary(body)
      const authorUsername = String(data.author ?? '').trim().toLowerCase() || null
      const author = authorUsername ? userByUsername.get(authorUsername) : undefined
      const authorName = String(data.authorName ?? '').trim() || author?.nickname || authorUsername || '匿名'
      const status = data.draft === true ? 'draft' as const : 'published' as const
      const cover = String(data.cover ?? '').trim() || `/api/cover/${slug}`
      const contentHash = createHash('sha256').update(body).digest('hex')

      const [existing] = await db
        .select({ id: posts.id, source: posts.source })
        .from(posts)
        .where(eq(posts.slug, slug))
        .limit(1)

      // 网页编辑器写的文章不会被文件覆盖
      if (existing && existing.source === 'editor') {
        result.skipped += 1
        continue
      }

      const values = {
        slug,
        title: title.slice(0, 120),
        summary: summary.slice(0, 300),
        body,
        coverUrl: cover,
        tags: normalizeTags(data.tags),
        authorId: author?.id ?? null,
        authorName: authorName.slice(0, 32),
        authorUsername,
        source: 'git' as const,
        sourcePath,
        contentHash,
        status,
        publishedAt: status === 'draft' ? null : (toDate(data.date) ?? new Date()),
        updatedAt: new Date(),
      }

      let postId: string
      if (existing) {
        await db.update(posts).set(values).where(eq(posts.id, existing.id))
        postId = existing.id
      }
      else {
        const [inserted] = await db.insert(posts).values(values).returning({ id: posts.id })
        postId = inserted!.id
      }
      result.upserted += 1

      // 重建与项目的关联
      const relatedSlugs = normalizeSlugs(data.projects)
      const relatedIds = relatedSlugs
        .map(projectSlug => projectIdBySlug.get(projectSlug))
        .filter((id): id is string => Boolean(id))

      const missing = relatedSlugs.filter(projectSlug => !projectIdBySlug.has(projectSlug))
      if (missing.length) {
        result.errors.push(`${sourcePath}：找不到项目 ${missing.join('、')}`)
      }

      await db.delete(postProjects).where(eq(postProjects.postId, postId))
      if (relatedIds.length) {
        await db.insert(postProjects).values(relatedIds.map(projectId => ({ postId, projectId })))
        result.relations += relatedIds.length
      }
    }
    catch (error) {
      result.errors.push(`${sourcePath}：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 仓库里被删除的文章，从数据库中一并移除（只处理 git 来源）
  const gitPosts = await db
    .select({ id: posts.id, sourcePath: posts.sourcePath })
    .from(posts)
    .where(eq(posts.source, 'git'))

  const orphanIds = gitPosts
    .filter(row => row.sourcePath && !seenPaths.has(row.sourcePath))
    .map(row => row.id)

  if (orphanIds.length) {
    await db.delete(posts).where(inArray(posts.id, orphanIds))
    result.removed = orphanIds.length
  }

  if (log) {
    console.log(`[posts] 扫描 ${result.scanned} 个文件，更新 ${result.upserted} 篇，关联 ${result.relations} 条，移除 ${result.removed} 篇`)
    for (const error of result.errors) console.warn(`[posts] ${error}`)
  }

  return result
}
