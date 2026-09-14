import { getDbHandle } from '../server/db/client.ts'
import { syncPostsFromDisk } from '../server/db/posts-sync.ts'

const handle = getDbHandle()

console.log(`数据库驱动：${handle.driver}`)
const result = await syncPostsFromDisk({ log: true })

console.log(`扫描文件：${result.scanned}`)
console.log(`写入/更新：${result.upserted}`)
console.log(`跳过（编辑器来源）：${result.skipped}`)
console.log(`项目关联：${result.relations}`)
console.log(`移除：${result.removed}`)

if (result.errors.length) {
  console.warn('需要注意的问题：')
  for (const error of result.errors) console.warn(`  - ${error}`)
}

await handle.close()
