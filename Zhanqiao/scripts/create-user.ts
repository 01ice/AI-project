import { parseArgs } from 'node:util'
import { eq, or } from 'drizzle-orm'
import { db, getDbHandle } from '../server/db/client.ts'
import { users } from '../server/db/schema.ts'
import { hashPassword } from '../server/utils/password.ts'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    username: { type: 'string' },
    nickname: { type: 'string' },
    password: { type: 'string' },
    admin: { type: 'boolean', default: false },
  },
})

const email = values.email?.trim().toLowerCase()
const username = values.username?.trim().toLowerCase()
const nickname = values.nickname?.trim()
const password = values.password

if (!email || !username || !nickname || !password) {
  console.error('用法：npm run user:create -- --email you@example.com --username yourname --nickname 你的昵称 --password 密码 [--admin]')
  process.exit(1)
}

if (password.length < 8) {
  console.error('密码至少 8 位')
  process.exit(1)
}

if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
  console.error('用户名需为 3-20 位小写字母、数字、下划线或连字符')
  process.exit(1)
}

const handle = getDbHandle()

const [existing] = await db
  .select({ id: users.id, email: users.email, username: users.username })
  .from(users)
  .where(or(eq(users.email, email), eq(users.username, username)))
  .limit(1)

if (existing) {
  console.error(existing.email === email ? '该邮箱已存在' : '该用户名已存在')
  await handle.close()
  process.exit(1)
}

const [row] = await db.insert(users).values({
  email,
  username,
  nickname,
  passwordHash: await hashPassword(password),
  // 命令行创建的账号视为已验证，可以直接发布项目
  emailVerifiedAt: new Date(),
  role: values.admin ? 'admin' : 'user',
}).returning({ id: users.id, email: users.email, username: users.username, role: users.role })

console.log('账号已创建：')
console.log(`  邮箱：${row!.email}`)
console.log(`  用户名：${row!.username}`)
console.log(`  角色：${row!.role}`)

await handle.close()
