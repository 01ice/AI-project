import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { drizzle as drizzlePostgres, type NodePgDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

/**
 * 统一的数据库类型。PGlite 与 postgres.js 共用同一套 pg-core 查询 API，
 * 因此这里统一按 NodePgDatabase 对外暴露，运行时按环境选择驱动。
 */
export type Database = NodePgDatabase<typeof schema>

export interface DbHandle {
  db: Database
  /** 执行 DDL 或多语句脚本，不关心返回值 */
  exec: (sqlText: string) => Promise<void>
  /** 执行查询并返回行数组 */
  query: <T = Record<string, unknown>>(sqlText: string) => Promise<T[]>
  close: () => Promise<void>
  driver: 'pglite' | 'postgres'
  target: string
}

function resolveTarget(): { driver: 'pglite' | 'postgres', target: string } {
  const url = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    return { driver: 'postgres', target: url }
  }
  const dir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), '.data/pglite')
  return { driver: 'pglite', target: dir }
}

function createHandle(): DbHandle {
  const { driver, target } = resolveTarget()

  if (driver === 'postgres') {
    const sql = postgres(target, { max: 10, onnotice: () => {} })
    const db = drizzlePostgres(sql, { schema })

    return {
      db,
      driver,
      target,
      exec: async (sqlText) => {
        await sql.unsafe(sqlText)
      },
      query: async <T>(sqlText: string) => (await sql.unsafe(sqlText)) as unknown as T[],
      close: async () => {
        await sql.end({ timeout: 5 })
      },
    }
  }

  mkdirSync(target, { recursive: true })
  const client = new PGlite(target)
  const db = drizzlePglite(client, { schema })

  return {
    db: db as unknown as Database,
    driver,
    target,
    exec: async (sqlText) => {
      await client.exec(sqlText)
    },
    query: async <T>(sqlText: string) => {
      const result = await client.query<T>(sqlText)
      return result.rows
    },
    close: async () => {
      await client.close()
    },
  }
}

// 复用单例：Nuxt 开发模式热更新会重复执行模块，避免重复打开数据库文件
const globalRef = globalThis as typeof globalThis & { __zhanqiaoDb?: DbHandle }

export function getDbHandle(): DbHandle {
  if (!globalRef.__zhanqiaoDb) {
    globalRef.__zhanqiaoDb = createHandle()
  }
  return globalRef.__zhanqiaoDb
}

export const db = getDbHandle().db
