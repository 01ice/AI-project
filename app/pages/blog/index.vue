<script setup lang="ts">
import type { PostListResponse } from '~~/shared/types'

const route = useRoute()

const query = computed(() => ({
  q: typeof route.query.q === 'string' ? route.query.q : undefined,
  tag: typeof route.query.tag === 'string' ? route.query.tag : undefined,
  page: Number(route.query.page) || 1,
  pageSize: 10,
}))

const { data, pending } = await useFetch<PostListResponse>('/api/posts', { query })

const tagCloud = computed(() => {
  const counts = new Map<string, number>()
  for (const post of data.value?.items ?? []) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
})

function withQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    if (typeof value === 'string' && value) next[key] = value
  }
  delete next.page
  if (patch.page) next.page = patch.page
  return { path: '/blog', query: next }
}

useHead({
  title: '博客 · 栈桥',
  meta: [{ name: 'description', content: '栈桥博客：AI 项目的成本复盘、技术选型与踩坑记录，来自社区成员的 Markdown 投稿。' }],
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
    <div>
      <header class="mb-4 border-b border-border-default pb-3">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-lg font-semibold text-fg-default">
            {{ query.q ? `搜索「${query.q}」` : '博客' }}
            <span class="ml-1 text-sm font-normal text-fg-muted">{{ data?.total ?? 0 }} 篇</span>
          </h1>
          <NuxtLink
            to="/blog/new"
            class="ml-auto inline-flex h-8 items-center rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white no-underline hover:bg-accent/90"
          >
            写文章
          </NuxtLink>
        </div>
        <p class="mt-1 text-xs text-fg-muted">
          所有人登录后都可以写文章，发表后经审核上线；也可以用 Markdown 文件提交 Pull Request。
        </p>
      </header>

      <p v-if="pending" class="py-16 text-center text-sm text-fg-muted">正在加载…</p>

      <p v-else-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
        还没有符合条件的文章。
      </p>

      <ul v-else class="space-y-4">
        <li
          v-for="post in data.items"
          :key="post.id"
          class="flex gap-4 rounded-md border border-border-default bg-canvas p-4 transition-colors hover:border-fg-subtle"
        >
          <NuxtLink :to="`/blog/${post.slug}`" class="shrink-0">
            <img
              v-if="post.coverUrl"
              :src="post.coverUrl"
              :alt="post.title"
              width="160"
              height="96"
              loading="lazy"
              class="h-24 w-40 rounded-md border border-border-muted object-cover"
            >
          </NuxtLink>

          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="`/blog/${post.slug}`"
              class="text-base font-semibold text-accent no-underline hover:underline"
            >
              {{ post.title }}
            </NuxtLink>

            <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">{{ post.summary }}</p>

            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              <NuxtLink
                v-if="post.authorUsername"
                :to="`/u/${post.authorUsername}`"
                class="inline-flex items-center gap-1 no-underline hover:underline"
              >
                <AppAvatar
                  :name="post.authorName"
                  :username="post.authorUsername ?? post.authorName"
                  :size="16"
                />
                {{ post.authorName }}
              </NuxtLink>
              <span v-else class="inline-flex items-center gap-1">
                <AppAvatar :name="post.authorName" :username="post.authorName" :size="16" />
                {{ post.authorName }}
              </span>
              <span>{{ relativeTime(post.publishedAt) }}</span>
              <TagChip
                v-for="tag in post.tags.slice(0, 3)"
                :key="tag"
                :label="tag"
                :to="withQuery({ tag })"
              />
            </div>

            <div v-if="post.projects.length" class="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span class="text-fg-subtle">涉及项目</span>
              <NuxtLink
                v-for="project in post.projects"
                :key="project.slug"
                :to="`/projects/${project.slug}`"
                class="rounded-full border border-border-muted px-2 py-0.5 text-fg-muted no-underline hover:border-accent hover:text-accent"
              >
                {{ project.name }}
              </NuxtLink>
            </div>
          </div>
        </li>
      </ul>

      <nav v-if="(data?.totalPages ?? 1) > 1" class="mt-5 flex items-center justify-center gap-2">
        <NuxtLink
          v-if="query.page > 1"
          :to="withQuery({ page: String(query.page - 1) })"
          class="rounded-md border border-border-default px-3 py-1.5 text-sm no-underline hover:border-accent hover:text-accent"
        >
          上一页
        </NuxtLink>
        <span class="text-sm text-fg-muted">第 {{ query.page }} / {{ data?.totalPages }} 页</span>
        <NuxtLink
          v-if="query.page < (data?.totalPages ?? 1)"
          :to="withQuery({ page: String(query.page + 1) })"
          class="rounded-md border border-border-default px-3 py-1.5 text-sm no-underline hover:border-accent hover:text-accent"
        >
          下一页
        </NuxtLink>
      </nav>
    </div>

    <aside class="space-y-4">
      <section class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">标签</h2>
        <div v-if="tagCloud.length" class="mt-3 flex flex-wrap gap-1.5">
          <TagChip
            v-for="[tag, count] in tagCloud"
            :key="tag"
            :label="`${tag} ${count}`"
            :to="withQuery({ tag })"
            :active="query.tag === tag"
          />
        </div>
        <p v-else class="mt-2 text-xs text-fg-muted">本页还没有标签</p>
      </section>

      <section class="rounded-md border border-border-default bg-canvas-subtle p-4 text-xs leading-5 text-fg-muted">
        <p class="font-semibold text-fg-default">想写一篇？</p>
        <p class="mt-1">
          复制 <code class="rounded bg-canvas px-1">content/posts/_template.md</code>，
          填好 frontmatter 后提交 Pull Request，合并后文章会自动出现在这里。
        </p>
      </section>
    </aside>
  </div>
</template>
