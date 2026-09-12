import { sql } from 'drizzle-orm'
import { db } from './client.ts'
import { categories } from './schema.ts'

/**
 * 站点初始化数据。
 * 分类由站主预设、普通用户不能创建，所以空库首次启动时要保证有分类可选，
 * 否则发布项目会因为「必须选分类」而卡住。
 */
const DEFAULT_CATEGORIES = [
  { name: 'AI 工具', slug: 'ai', description: '模型、Agent 与智能化产品', sortOrder: 1 },
  { name: '开发者工具', slug: 'devtools', description: '提升开发效率的工具链', sortOrder: 2 },
  { name: 'Web 应用', slug: 'web', description: '跑在浏览器里的产品与服务', sortOrder: 3 },
  { name: '移动应用', slug: 'mobile', description: 'iOS、Android 与小程序', sortOrder: 4 },
  { name: '开源库', slug: 'library', description: '可以被别人引用的代码', sortOrder: 5 },
  { name: '硬件与嵌入式', slug: 'hardware', description: '电路、传感器与机器人', sortOrder: 6 },
]

/** 分类表为空时写入默认分类；已有数据则不动 */
export async function ensureDefaultCategories(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories)

  if ((row?.count ?? 0) > 0) return 0

  await db.insert(categories).values(DEFAULT_CATEGORIES)
  return DEFAULT_CATEGORIES.length
}
