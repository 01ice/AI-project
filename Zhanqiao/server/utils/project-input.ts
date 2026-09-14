import { z } from 'zod'

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform(value => (value ? value : null))
  .refine(value => value === null || /^https?:\/\//.test(value), '链接需要以 http:// 或 https:// 开头')

const optionalMoney = z
  .union([z.number(), z.null()])
  .optional()
  .transform(value => (value === undefined ? null : value))
  .refine(value => value === null || (Number.isInteger(value) && value >= 0 && value <= 100_000_000), '金额需要是非负整数')

export const projectInputSchema = z.object({
  title: z.string().trim().min(2, '标题至少 2 个字').max(80, '标题最多 80 个字'),
  summary: z.string().trim().min(20, '一句话简介至少 20 个字').max(200, '简介最多 200 个字'),
  // 长内容走文章（content/posts），项目条目只保留一段简短的补充说明
  body: z.string().trim().max(300, '补充说明最多 300 字').default(''),
  coverUrl: z.string().trim().min(1, '请上传封面图').max(300),
  screenshots: z.array(z.string().max(300)).max(5, '截图最多 5 张').default([]),
  categoryId: z.string().uuid('请选择分类'),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  extraLinks: z.array(z.object({
    label: z.string().trim().min(1).max(20),
    url: z.string().trim().max(300).refine(value => /^https?:\/\//.test(value), '链接需要以 http:// 或 https:// 开头'),
  })).max(3, '其他链接最多 3 条').default([]),
  tagIds: z.array(z.string().uuid()).max(5, '最多选择 5 个已有标签').default([]),
  newTags: z.array(z.object({
    name: z.string().trim().min(2, '标签至少 2 个字').max(16, '标签最多 16 个字'),
    group: z.enum(['stack', 'ai_model', 'ai_tech', 'ai_domain']),
  })).max(3, '最多申请 3 个新标签').default([]),
  isAi: z.boolean().default(false),
  aiModels: z.array(z.string().trim().min(1).max(60)).max(6, '最多填写 6 个模型').default([]),
  aiHosting: z.enum(['api', 'self_hosted', 'hybrid']).nullable().default(null),
  monthlyCostCny: optionalMoney,
  monthlyRevenueCny: optionalMoney,
  totalRevenueCny: optionalMoney,
  revenueModel: z.enum(['free', 'freemium', 'subscription', 'one_time', 'ads', 'service', 'not_yet']).nullable().default(null),
  costNote: z.string().trim().max(200, '成本说明最多 200 个字').optional().transform(value => (value ? value : null)),
  revenueNote: z.string().trim().max(200, '收益说明最多 200 个字').optional().transform(value => (value ? value : null)),
  status: z.enum(['draft', 'pending']).default('pending'),
}).refine(
  data => !data.isAi || data.aiModels.length > 0,
  { message: 'AI 项目请至少填写一个模型', path: ['aiModels'] },
).refine(
  data => !data.isAi || data.aiHosting !== null,
  { message: '请选择模型使用方式', path: ['aiHosting'] },
)

export type ProjectInput = z.infer<typeof projectInputSchema>
