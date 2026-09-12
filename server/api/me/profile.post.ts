import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { requireUser, toSessionUser } from '../../utils/auth.ts'
import { readBodyAs } from '../../utils/validate.ts'

const bodySchema = z.object({
  nickname: z.string().trim().min(1, '请填写昵称').max(16, '昵称最多 16 个字'),
  bio: z.string().trim().max(200, '简介最多 200 个字').optional(),
  avatarUrl: z.string().trim().max(300).optional(),
})

/** 编辑个人资料：昵称、简介、头像（用户名是唯一标识，不允许修改） */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBodyAs(event, bodySchema)

  const [updated] = await db.update(users)
    .set({
      nickname: body.nickname,
      bio: body.bio?.trim() || null,
      avatarUrl: body.avatarUrl?.trim() || null,
    })
    .where(eq(users.id, user.id))
    .returning()

  return { user: toSessionUser(updated!) }
})
