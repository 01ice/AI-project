import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

/** 解析并校验请求体，失败时返回 400 与第一条错误信息 */
export async function readBodyAs<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event).catch(() => null)
  const result = schema.safeParse(body ?? {})

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.issues[0]?.message ?? '请求参数不正确',
    })
  }

  return result.data
}
