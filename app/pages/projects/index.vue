<script setup lang="ts">
import type { CategoryItem, ProjectListResponse, TagItem } from '~~/shared/types'

const route = useRoute()

const query = computed(() => ({
  q: typeof route.query.q === 'string' ? route.query.q : undefined,
  category: typeof route.query.category === 'string' ? route.query.category : undefined,
  tag: typeof route.query.tag === 'string' ? route.query.tag : undefined,
  sort: typeof route.query.sort === 'string' ? route.query.sort : 'latest',
  page: Number(route.query.page) || 1,
  pageSize: 10,
}))

const { data, pending } = await useFetch<ProjectListResponse>('/api/projects', { query })
const { data: categories } = await useFetch<CategoryItem[]>('/api/categories')
const { data: tags } = await useFetch<TagItem[]>('/api/tags', { query: { limit: 24 } })

const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最热', value: 'hot' },
  { label: '推荐', value: 'featured' },
]

/** 在当前查询基础上切换某个筛选条件，同时重置页码 */
function withQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    if (typeof value === 'string' && value) next[key] = value
  }
  delete next.page
  if (patch.page) next.page = patch.page
  return { path: '/projects', query: next }
}

useHead({ title: '项目 · 栈桥' })
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
    <aside class="space-y-5">
      <section>
        <h2 class="mb-2 text-sm font-semibold text-fg-default">分类</h2>
        <ul class="space-y-0.5">
          <li>
            <NuxtLink
              :to="withQuery({ category: undefined })"
              class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm no-underline"
              :class="!query.category ? 'bg-accent-subtle font-medium text-accent' : 'text-fg-default hover:bg-canvas-subtle'"
            >
              <span>全部项目</span>
              <span class="text-xs text-fg-subtle">{{ data?.total ?? 0 }}</span>
            </NuxtLink>
          </li>
          <li v-for="category in categories ?? []" :key="category.id">
            <NuxtLink
              :to="withQuery({ category: category.slug })"
              class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm no-underline"
              :class="query.category === category.slug
                ? 'bg-accent-subtle font-medium text-accent'
                : 'text-fg-default hover:bg-canvas-subtle'"
            >
              <span>{{ category.name }}</span>
              <span class="text-xs text-fg-subtle">{{ category.projectCount }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-fg-default">技术栈</h2>
        <div class="flex flex-wrap gap-1.5">
          <TagChip
            v-for="tag in tags ?? []"
            :key="tag.id"
            :label="tag.name"
            :to="withQuery({ tag: tag.slug })"
            :active="query.tag === tag.slug"
          />
        </div>
      </section>
    </aside>

    <div>
      <div class="mb-4 flex flex-wrap items-center gap-3 border-b border-border-default pb-3">
        <h1 class="text-lg font-semibold text-fg-default">
          {{ query.q ? `搜索「${query.q}」` : '全部项目' }}
          <span class="ml-1 text-sm font-normal text-fg-muted">{{ data?.total ?? 0 }} 个</span>
        </h1>

        <div class="ml-auto flex items-center gap-1 rounded-md border border-border-default p-0.5">
          <NuxtLink
            v-for="option in sortOptions"
            :key="option.value"
            :to="withQuery({ sort: option.value })"
            class="rounded px-2.5 py-1 text-xs no-underline"
            :class="query.sort === option.value
              ? 'bg-canvas-subtle font-medium text-fg-default'
              : 'text-fg-muted hover:text-fg-default'"
          >
            {{ option.label }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="pending" class="py-16 text-center text-sm text-fg-muted">
        正在加载…
      </div>

      <div v-else-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center">
        <p class="text-sm text-fg-muted">没有找到符合条件的项目</p>
        <NuxtLink to="/projects" class="mt-2 inline-block text-sm no-underline hover:underline">
          清空筛选条件
        </NuxtLink>
      </div>

      <div v-else class="space-y-3">
        <ProjectCard v-for="project in data.items" :key="project.id" :project="project" />
      </div>

      <nav v-if="(data?.totalPages ?? 1) > 1" class="mt-5 flex items-center justify-center gap-2">
        <NuxtLink
          v-if="query.page > 1"
          :to="withQuery({ page: String(query.page - 1) })"
          class="rounded-md border border-border-default px-3 py-1.5 text-sm no-underline hover:border-accent hover:text-accent"
        >
          上一页
        </NuxtLink>
        <span class="text-sm text-fg-muted">
          第 {{ query.page }} / {{ data?.totalPages }} 页
        </span>
        <NuxtLink
          v-if="query.page < (data?.totalPages ?? 1)"
          :to="withQuery({ page: String(query.page + 1) })"
          class="rounded-md border border-border-default px-3 py-1.5 text-sm no-underline hover:border-accent hover:text-accent"
        >
          下一页
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
