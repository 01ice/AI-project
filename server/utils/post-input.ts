import { z } from 'zod'

export const postInputSchema = z.object({
  // 草稿阶段可以很宽松，正式发表的严格要求在接口里判断
  title: z.string().trim().min(1, '请填写标题').max(120, '标题最多 120 个字'),
  slug: z.string().trim().max(80).optional(),
  summary: z.string().trim().max(300, '摘要最多 300 个字').optional(),
  body: z.string().trim().max(50000, '正文太长了').default(''),
  coverUrl: z.string().trim().max(300).optional(),
  tags: z.array(z.string().trim().min(1).max(16)).max(8, '最多 8 个标签').default([]),
  projectSlugs: z.array(z.string().trim().max(80)).max(10, '最多关联 10 个项目').default([]),
  status: z.enum(['draft', 'pending']).default('draft'),
})

export type PostInput = z.infer<typeof postInputSchema>
