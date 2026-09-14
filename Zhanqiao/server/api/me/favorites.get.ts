import { desc, eq } from 'drizzle-orm'
import { requireUser } from '../../utils/auth.ts'
import { db } from '../../db/client.ts'
import { categories, favorites, projects, users } from '../../db/schema.ts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const rows = await db
    .select({
      projectId: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      coverUrl: projects.coverUrl,
      categoryName: categories.name,
      authorName: users.nickname,
      createdAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(projects, eq(favorites.projectId, projects.id))
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .innerJoin(users, eq(projects.authorId, users.id))
    .where(eq(favorites.userId, user.id))
    .orderBy(desc(favorites.createdAt))

  return {
    items: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
  }
})
