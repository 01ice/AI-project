export type AiHosting = 'api' | 'self_hosted' | 'hybrid'

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
  screenshots: string[]
  repoUrl: string | null
  demoUrl: string | null
  extraLinks: { label: string, url: string }[]
  authorBio: string | null
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
