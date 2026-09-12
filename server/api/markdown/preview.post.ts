import { z } from 'zod'
import { requireUser } from '../../utils/auth.ts'
import { renderMarkdown } from '../../utils/markdown.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  text: z.string().max(30000).default(''),
})

/** 表单里的实时预览，复用与服务端渲染相同的过滤规则 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const { text } = await readBodyAs(event, bodySchema)
  return { html: renderMarkdown(text) }
})
