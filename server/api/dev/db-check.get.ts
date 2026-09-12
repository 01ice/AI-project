/**
 * 开发环境专用：检查枚举值与新增字段是否真的生效，排查迁移问题用。
 */
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const { getDbHandle } = await import('../../db/client.ts')
  const handle = getDbHandle()

  const statuses = await handle.query<{ value: string }>(
    'select unnest(enum_range(null::post_status))::text as value',
  )

  const columns = await handle.query<{ column_name: string, data_type: string }>(
    `select column_name, data_type from information_schema.columns
     where table_name = 'posts' and column_name in ('moderation_source', 'moderation_note', 'status')
     order by column_name`,
  )

  const migrations = await handle.query<{ name: string }>('select name from _migrations order by name')

  return {
    postStatusValues: statuses.map(row => row.value),
    postColumns: columns,
    migrations: migrations.map(row => row.name),
  }
})
