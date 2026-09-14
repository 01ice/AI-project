import { and, desc, eq } from 'drizzle-orm'
import type { PostListItem, ProjectListItem } from '../../shared/types.ts'
import { db } from '../db/client.ts'
import { categories, posts, projects, users } from '../db/schema.ts'

export interface PublicProfile {
  username: string
  nickname: string
  avatarUrl: string | null
  bio: string | null
  role: 'user' | 'admin'
  joinedAt: string
  projectCount: number
  postCount: number
  totalViews: number
  projects: ProjectListItem[]
  posts: PostListItem[]
}

/** 用户公开主页：只展示已发布的内容 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1)

  if (!user || user.status === 'banned') return null

  const projectRows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      coverUrl: projects.coverUrl,
      categoryName: categories.name,
      categorySlug: categories.slug,
      likeCount: projects.likeCount,
      favoriteCount: projects.favoriteCount,
      commentCount: projects.commentCount,
      viewCount: projects.viewCount,
      publishedAt: projects.publishedAt,
      isAi: projects.isAi,
      aiModels: projects.aiModels,
      aiHosting: projects.aiHosting,
      monthlyCostCny: projects.monthlyCostCny,
      monthlyRevenueCny: projects.monthlyRevenueCny,
      totalRevenueCny: projects.totalRevenueCny,
      revenueModel: projects.revenueModel,
      costNote: projects.costNote,
      revenueNote: projects.revenueNote,
    })
    .from(projects)
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .where(and(eq(projects.authorId, user.id), eq(projects.status, 'published')))
    .orderBy(desc(projects.publishedAt))
    .limit(30)

  const postRows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      coverUrl: posts.coverUrl,
      tags: posts.tags,
      viewCount: posts.viewCount,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(eq(posts.authorId, user.id), eq(posts.status, 'published')))
    .orderBy(desc(posts.publishedAt))
    .limit(30)

  const profileProjects: ProjectListItem[] = projectRows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    authorName: user.nickname,
    authorUsername: user.username,
    authorAvatarUrl: user.avatarUrl,
    tags: [],
    likeCount: row.likeCount,
    favoriteCount: row.favoriteCount,
    commentCount: row.commentCount,
    viewCount: row.viewCount,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    metrics: {
      isAi: row.isAi,
      models: row.aiModels ?? [],
      hosting: row.aiHosting,
      monthlyCostCny: row.monthlyCostCny,
      monthlyRevenueCny: row.monthlyRevenueCny,
      totalRevenueCny: row.totalRevenueCny,
      revenueModel: row.revenueModel,
      costNote: row.costNote,
      revenueNote: row.revenueNote,
    },
  }))

  const profilePosts: PostListItem[] = postRows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    tags: row.tags ?? [],
    authorName: user.nickname,
    authorUsername: user.username,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : new Date().toISOString(),
    viewCount: row.viewCount,
    projects: [],
  }))

  return {
    username: user.username,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    joinedAt: user.createdAt.toISOString(),
    projectCount: profileProjects.length,
    postCount: profilePosts.length,
    totalViews: profileProjects.reduce((sum, item) => sum + item.viewCount, 0),
    projects: profileProjects,
    posts: profilePosts,
  }
}
