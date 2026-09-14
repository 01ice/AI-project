import { getDbHandle } from '../server/db/client.ts'
import { seedDatabase } from '../server/db/seed.ts'

const handle = getDbHandle()

if (handle.driver === 'postgres' && !process.argv.includes('--force')) {
  console.error('检测到远程 PostgreSQL 数据库。种子脚本会清空全部业务数据。')
  console.error('确认要执行请追加 --force，例如：npm run db:seed -- --force')
  await handle.close()
  process.exit(1)
}

console.log(`数据库驱动：${handle.driver}`)
console.log(`数据库地址：${handle.target}`)

const result = await seedDatabase(handle)

console.log(`已写入 ${result.categories} 个分类`)
console.log(`已写入 ${result.tags} 个标签`)
console.log(`已写入 ${result.users} 个用户`)
console.log(`已写入 ${result.projects} 个项目`)
console.log(`已写入 ${result.comments} 条评论`)
console.log(`已同步 ${result.posts} 篇文章`)
console.log('种子数据写入完成')

await handle.close()
