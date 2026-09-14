import { getDbHandle } from '../server/db/client.ts'
import { runMigrations } from '../server/db/migrate.ts'

const handle = getDbHandle()

console.log(`数据库驱动：${handle.driver}`)
console.log(`数据库地址：${handle.target}`)

try {
  await runMigrations(handle)
}
catch (error) {
  console.error('迁移失败：', error)
  process.exitCode = 1
}
finally {
  await handle.close()
}
