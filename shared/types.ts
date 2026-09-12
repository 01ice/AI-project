export type AiHosting = 'api' | 'self_hosted' | 'hybrid'

export interface SessionUser {
  id: string
  username: string
  nickname: string
  email: string
  emailVerified: boolean
  avatarUrl: string | null
  role: 'user' | 'admin'
}

export type ProjectStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'offline'

export type TagGroup = 'stack' | 'ai_model' | 'ai_tech' | 'ai_domain'

export interface ProjectFormPayload {
  title: string
  summary: string
  body: string
  coverUrl: string
  screenshots: string[]
  categoryId: string
  repoUrl: string
  demoUrl: string
  extraLinks: { label: string, url: string }[]
  tagIds: string[]
  newTags: { name: string, group: TagGroup }[]
  isAi: boolean
  aiModels: string[]
  aiHosting: AiHosting | null
  monthlyCostCny: number | null
  monthlyRevenueCny: number | null
  totalRevenueCny: number | null
  revenueModel: RevenueModel | null
  costNote: string
  revenueNote: string
}

export interface ProjectTagRef {
  name: string
  slug: string
}

export interface ManagedProject {
  id: string
  slug: string
  status: ProjectStatus
  moderationNote: string | null
  title: string
  summary: string
  body: string
  coverUrl: string
  screenshots: string[]
  categoryId: string | null
  repoUrl: string | null
  demoUrl: string | null
  extraLinks: { label: string, url: string }[]
  isAi: boolean
  aiModels: string[]
  aiHosting: AiHosting | null
  monthlyCostCny: number | null
  monthlyRevenueCny: number | null
  totalRevenueCny: number | null
  revenueModel: RevenueModel | null
  costNote: string | null
  revenueNote: string | null
  tags: ProjectTagRef[]
  createdAt: string
  updatedAt: string
}

export interface MyProjectItem {
  id: string
  slug: string
  title: string
  summary: string
  coverUrl: string
  status: ProjectStatus
  categoryName: string | null
  moderationNote: string | null
  tags: ProjectTagRef[]
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
  publishedAt: string | null
  updatedAt: string
}

export type RevenueModel =
  | 'free'
  | 'freemium'
  | 'subscription'
  | 'one_time'
  | 'ads'
  | 'service'
  | 'not_yet'

export interface ProjectMetrics {
  isAi: boolean
  /** AI 项目专属 */
  models: string[]
  hosting: AiHosting | null
  /** 成本与收益：所有项目均可选填 */
  monthlyCostCny: number | null
  monthlyRevenueCny: number | null
  totalRevenueCny: number | null
  revenueModel: RevenueModel | null
  costNote: string | null
  revenueNote: string | null
}

export interface ProjectListItem {
  id: string
  slug: string
  title: string
  summary: string
  coverUrl: string
  categoryName: string | null
  categorySlug: string | null
  authorName: string
  authorUsername: string
  authorAvatarUrl: string | null
  tags: { name: string, slug: string }[]
  likeCount: number
  favoriteCount: number
  viewCount: number
  commentCount: number
  publishedAt: string | null
  metrics: ProjectMetrics
}

export interface ProjectListResponse {
  items: ProjectListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ProjectDetail extends ProjectListItem {
  bodyHtml: string
  relatedPosts: RelatedPostItem[]
  screenshots: string[]
  repoUrl: string | null
  demoUrl: string | null
  extraLinks: { label: string, url: string }[]
  authorBio: string | null
  createdAt: string
}

export interface PostListItem {
  id: string
  slug: string
  title: string
  summary: string
  coverUrl: string | null
  tags: string[]
  authorName: string
  authorUsername: string | null
  publishedAt: string
  viewCount: number
  projects: { name: string, slug: string }[]
}

export interface PostListResponse {
  items: PostListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PostDetail extends PostListItem {
  bodyHtml: string
  updatedAt: string
}

export interface RelatedPostItem {
  id: string
  slug: string
  title: string
  summary: string
  authorName: string
  publishedAt: string
}

export interface AdminProjectItem {
  id: string
  slug: string
  title: string
  summary: string
  note: string
  coverUrl: string
  screenshots: string[]
  repoUrl: string | null
  demoUrl: string | null
  status: ProjectStatus
  moderationNote: string | null
  categoryName: string | null
  authorName: string
  authorUsername: string
  authorEmailVerified: boolean
  isAi: boolean
  aiModels: string[]
  aiHosting: string | null
  monthlyCostCny: number | null
  monthlyRevenueCny: number | null
  tags: { name: string, slug: string, status: string }[]
  createdAt: string
  updatedAt: string
}

export interface AdminTagItem {
  id: string
  name: string
  slug: string
  group: TagGroup
  status: string
  usageCount: number
  description: string | null
  creatorName: string | null
  createdAt: string
}

export interface CategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  projectCount: number
}

export interface TagItem {
  id: string
  name: string
  slug: string
  group: 'stack' | 'ai_model' | 'ai_tech' | 'ai_domain'
  usageCount: number
}

export interface CommentItem {
  id: string
  content: string
  createdAt: string
  authorName: string
  authorUsername: string
  authorAvatarUrl: string | null
  replyToName: string | null
  replies: CommentItem[]
}
