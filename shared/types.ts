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
