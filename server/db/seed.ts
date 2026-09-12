import type { DbHandle } from './client.ts'
import { db } from './client.ts'
import { categories, comments, projectTags, projects, tags, users } from './schema.ts'
import { seedCategories, seedComments, seedProjects, seedTags, seedUsers } from './seed-data.ts'
import { syncPostsFromDisk } from './posts-sync.ts'

export interface SeedResult {
  categories: number
  tags: number
  users: number
  projects: number
  comments: number
  posts: number
}

/**
 * 旧结构里项目有一条很长的正文，现在长内容归文章，项目只保留一段简短的补充说明。
 * 这里把种子数据里的长正文压成一段说明文字。
 */
function toNote(body: string, limit = 150): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}.*$/gm, ' ')
    .replace(/^>.*$/gm, ' ')
    .replace(/[*_`#>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.length > limit ? `${plain.slice(0, limit)}…` : plain
}

/**
 * 清空业务数据并写入示例数据。
 * 本地开发与 CLI 脚本共用这份逻辑，避免两套实现走偏。
 */
export async function seedDatabase(handle: DbHandle): Promise<SeedResult> {
  const TABLES = [
    'moderation_logs', 'reports', 'favorites', 'likes', 'comments', 'email_codes',
    'post_projects', 'posts',
    'project_tags', 'projects', 'tags', 'categories', 'sessions', 'users',
  ]

  await handle.exec(`truncate table ${TABLES.join(', ')} restart identity cascade`)

  const categoryRows = await db.insert(categories).values(seedCategories).returning({
    id: categories.id,
    slug: categories.slug,
  })
  const categoryIdBySlug = new Map(categoryRows.map(row => [row.slug, row.id]))

  const tagRows = await db.insert(tags).values(seedTags.map(tag => ({
    name: tag.name,
    slug: tag.slug,
    tagGroup: tag.group,
    status: 'approved' as const,
    usageCount: 0,
  }))).returning({ id: tags.id, name: tags.name })
  const tagIdByName = new Map(tagRows.map(row => [row.name, row.id]))

  const now = Date.now()
  const userRows = await db.insert(users).values(seedUsers.map(user => ({
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    emailVerifiedAt: new Date(now - 90 * 24 * 3600 * 1000),
    // 占位哈希：正式账号请用 npm run user:create 创建
    passwordHash: '!seed-account-no-password',
    role: user.role,
    bio: user.bio,
  }))).returning({ id: users.id, username: users.username })
  const userIdByUsername = new Map(userRows.map(row => [row.username, row.id]))

  const projectIdBySlug = new Map<string, string>()
  for (const project of seedProjects) {
    const [row] = await db.insert(projects).values({
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      body: toNote(project.body),
      coverUrl: `/api/cover/${project.slug}`,
      screenshots: [],
      repoUrl: project.repoUrl ?? null,
      demoUrl: project.demoUrl ?? null,
      extraLinks: [],
      categoryId: categoryIdBySlug.get(project.categorySlug) ?? null,
      authorId: userIdByUsername.get(project.authorUsername)!,
      status: 'published',
      moderationSource: 'llm',
      featured: project.featured ?? false,
      isAi: Boolean(project.metrics?.models?.length || project.metrics?.hosting),
      aiModels: project.metrics?.models ?? [],
      aiHosting: project.metrics?.hosting ?? null,
      monthlyCostCny: project.metrics?.cost ?? null,
      monthlyRevenueCny: project.metrics?.revenue ?? null,
      totalRevenueCny: project.metrics?.total ?? null,
      revenueModel: project.metrics?.revenueModel ?? null,
      costNote: project.metrics?.costNote ?? null,
      revenueNote: project.metrics?.revenueNote ?? null,
      viewCount: project.viewCount,
      likeCount: project.likeCount,
      favoriteCount: project.favoriteCount,
      publishedAt: new Date(now - project.daysAgo * 24 * 3600 * 1000),
      createdAt: new Date(now - (project.daysAgo + 1) * 24 * 3600 * 1000),
    }).returning({ id: projects.id })

    const projectId = row!.id
    projectIdBySlug.set(project.slug, projectId)

    await db.insert(projectTags).values(project.tags.map(name => ({
      projectId,
      tagId: tagIdByName.get(name)!,
    })))
  }

  // 标签使用次数按实际关联项目数统计
  await handle.exec(`
    update tags set usage_count = coalesce(sub.cnt, 0)
    from (select tag_id, count(*) as cnt from project_tags group by tag_id) as sub
    where tags.id = sub.tag_id
  `)

  /** 记录已插入评论，用于把二级回复挂到正确的父评论上 */
  const insertedComments = new Map<string, { id: string, rootId: string | null, userId: string }>()
  let commentCount = 0

  for (const comment of seedComments) {
    const projectId = projectIdBySlug.get(comment.projectSlug)
    if (!projectId) continue

    const userId = userIdByUsername.get(comment.authorUsername)!
    let parentId: string | null = null
    let rootId: string | null = null
    let replyToUserId: string | null = null

    if (comment.replyToUsername) {
      const target = insertedComments.get(`${comment.projectSlug}:${comment.replyToUsername}`)
      if (target) {
        parentId = target.id
        rootId = target.rootId ?? target.id
        replyToUserId = target.userId
      }
    }

    const [row] = await db.insert(comments).values({
      targetType: 'project',
      targetId: projectId,
      userId,
      content: comment.content,
      parentId,
      rootId,
      replyToUserId,
      createdAt: new Date(now - comment.hoursAgo * 3600 * 1000),
    }).returning({ id: comments.id })

    insertedComments.set(`${comment.projectSlug}:${comment.authorUsername}`, {
      id: row!.id,
      rootId,
      userId,
    })
    commentCount += 1
  }

  // 评论数按实际数据回写
  await handle.exec(`
    update projects set comment_count = coalesce(sub.cnt, 0)
    from (select target_id, count(*) as cnt from comments group by target_id) as sub
    where projects.id = sub.target_id
  `)

  // 文章来自 content/posts 下的 Markdown，灌完数据后同步一次
  const postResult = await syncPostsFromDisk()

  return {
    categories: categoryRows.length,
    tags: tagRows.length,
    users: userRows.length,
    projects: seedProjects.length,
    comments: commentCount,
    posts: postResult.upserted,
  }
}
