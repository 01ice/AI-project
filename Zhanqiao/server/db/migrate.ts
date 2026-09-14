import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { DbHandle } from './client.ts'

const MIGRATIONS_TABLE = `
  create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`

/** drizzle-kit 生成的 SQL 用这个标记分隔语句 */
const STATEMENT_BREAKPOINT = '--> statement-breakpoint'

export async function runMigrations(handle: DbHandle, options: { log?: boolean } = {}): Promise<string[]> {
  const log = options.log ?? true
  const migrationsDir = path.resolve(process.cwd(), 'drizzle')

  await handle.exec(MIGRATIONS_TABLE)
  const appliedRows = await handle.query<{ name: string }>('select name from _migrations')
  const applied = new Set(appliedRows.map(row => row.name))

  let files: string[] = []
  try {
    files = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort()
  }
  catch {
    throw new Error(`未找到迁移目录：${migrationsDir}，请先执行 npm run db:generate`)
  }

  const executed: string[] = []
  for (const file of files) {
    if (applied.has(file)) continue

    const content = await readFile(path.join(migrationsDir, file), 'utf8')
    const statements = content
      .split(STATEMENT_BREAKPOINT)
      .map(statement => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      await handle.exec(statement)
    }

    await handle.exec(`insert into _migrations (name) values ('${file.replace(/'/g, '\'\'')}')`)
    executed.push(file)
    if (log) console.log(`  ✓ 已应用迁移 ${file}`)
  }

  if (log) {
    console.log(executed.length
      ? `共应用 ${executed.length} 个迁移文件`
      : '数据库已是最新，无迁移需要应用')
  }

  return executed
}

/**
 * 进程内只执行一次迁移。
 * 多个 Nitro 插件可能并发初始化，各跑各的会在 DDL 上撞车
 * （典型报错：duplicate key ... pg_type_typname_nsp_index）。
 */
let pendingMigrations: Promise<string[]> | null = null

export function ensureMigrations(
  handle: DbHandle,
  options: { log?: boolean } = {},
): Promise<string[]> {
  if (!pendingMigrations) {
    pendingMigrations = runMigrations(handle, options).catch((error) => {
      // 失败后清空，允许后续重试
      pendingMigrations = null
      throw error
    })
  }

  return pendingMigrations
}
