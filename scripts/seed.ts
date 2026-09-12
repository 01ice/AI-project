import { db, getDbHandle } from '../server/db/client.ts'
import { categories, comments, projectTags, projects, tags, users } from '../server/db/schema.ts'
import { seedCategories, seedComments, seedProjects, seedTags, seedUsers } from './seed-data.ts'

const handle = getDbHandle()

if (handle.driver === 'postgres' && !process.argv.includes('--force')) {
  console.error('检测到远程 PostgreSQL 数据库。种子脚本会清空全部业务数据。')
  console.error('确认要执行请追加 --force，例如：npm run db:seed -- --force')
  await handle.close()
  process.exit(1)
}

console.log(`数据库驱动：${handle.driver}`)
console.log(`数据库地址：${handle.target}`)

const TABLES = [
  'moderation_logs', 'reports', 'favorites', 'likes', 'comments',
  'project_tags', 'projects', 'tags', 'categories', 'sessions', 'users',
]

await handle.exec(`truncate table ${TABLES.join(', ')} restart identity cascade`)
console.log('已清空旧数据')

const categoryRows = await db.insert(categories).values(seedCategories).returning({
  id: categories.id,
  slug: categories.slug,
})
const categoryIdBySlug = new Map(categoryRows.map(row => [row.slug, row.id]))
console.log(`已写入 ${categoryRows.length} 个分类`)

const tagRows = await db.insert(tags).values(seedTags.map(tag => ({
  name: tag.name,
  slug: tag.slug,
  status: 'approved' as const,
  usageCount: 0,
}))).returning({ id: tags.id, name: tags.name })
const tagIdByName = new Map(tagRows.map(row => [row.name, row.id]))
console.log(`已写入 ${tagRows.length} 个标签`)

const now = Date.now()
const userRows = await db.insert(users).values(seedUsers.map(user => ({
  username: user.username,
  nickname: user.nickname,
  email: user.email,
  emailVerifiedAt: new Date(now - 90 * 24 * 3600 * 1000),
  // 占位哈希：D2 实现注册登录后会提供正式的账号创建脚本
  passwordHash: '!seed-account-no-password',
  role: user.role,
  bio: user.bio,
}))).returning({ id: users.id, username: users.username })
const userIdByUsername = new Map(userRows.map(row => [row.username, row.id]))
console.log(`已写入 ${userRows.length} 个用户`)

const projectIdBySlug = new Map<string, string>()
for (const project of seedProjects) {
  const [row] = await db.insert(projects).values({
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    body: project.body,
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
console.log(`已写入 ${seedProjects.length} 个项目`)

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
console.log(`已写入 ${commentCount} 条评论`)

await handle.close()
console.log('种子数据写入完成')
