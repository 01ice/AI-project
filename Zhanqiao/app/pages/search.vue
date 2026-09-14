<script setup lang="ts">
import type { SearchResponse } from '~~/shared/types'

useHead({ title: '搜索 · 栈桥' })

const route = useRoute()
const keyword = ref(typeof route.query.q === 'string' ? route.query.q : '')

const { data, pending } = await useFetch<SearchResponse>('/api/search', {
  query: computed(() => ({ q: typeof route.query.q === 'string' ? route.query.q : '' })),
})

const totalHits = computed(() => (data.value?.projects.length ?? 0) + (data.value?.posts.length ?? 0))

function submit() {
  const q = keyword.value.trim()
  return navigateTo({ path: '/search', query: q ? { q } : {} })
}
</script>

<template>
  <div class="w-full">
    <header class="mb-5">
      <h1 class="text-xl font-semibold text-fg-default">搜索</h1>
      <form class="mt-3 flex gap-2" @submit.prevent="submit">
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索项目、文章、标签…"
          class="h-9 flex-1 card px-3 text-sm focus:border-accent focus:outline-none"
        >
        <button
          type="submit"
          class="h-9 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90"
        >
          搜索
        </button>
      </form>
      <p class="mt-2 text-xs text-fg-subtle">
        支持项目标题、简介、补充说明、标签，以及文章标题、摘要与正文
      </p>
    </header>

    <p v-if="pending" class="py-16 text-center text-sm text-fg-muted">正在搜索…</p>

    <p v-else-if="!data?.q" class="py-16 text-center text-sm text-fg-muted">
      输入关键词开始搜索
    </p>

    <p v-else-if="!totalHits" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
      没有找到与「{{ data.q }}」相关的内容
    </p>

    <div v-else class="space-y-6">
      <p class="text-xs text-fg-muted">「{{ data.q }}」共找到 {{ totalHits }} 条结果</p>

      <section v-if="data.projects.length">
        <h2 class="mb-3 text-base font-semibold text-fg-default">
          项目 <span class="text-sm font-normal text-fg-muted">{{ data.projects.length }}</span>
        </h2>
        <div class="space-y-3">
          <ProjectCard v-for="project in data.projects" :key="project.id" :project="project" />
        </div>
      </section>

      <section v-if="data.posts.length">
        <h2 class="mb-3 text-base font-semibold text-fg-default">
          文章 <span class="text-sm font-normal text-fg-muted">{{ data.posts.length }}</span>
        </h2>
        <ul class="space-y-3">
          <li
            v-for="post in data.posts"
            :key="post.id"
            class="flex gap-3 card p-3"
          >
            <img
              v-if="post.coverUrl"
              :src="post.coverUrl"
              :alt="post.title"
              width="96"
              height="64"
              loading="lazy"
              class="h-16 w-24 shrink-0 rounded-md border border-border-muted object-cover"
            >
            <div class="min-w-0 flex-1">
              <NuxtLink
                :to="`/blog/${post.slug}`"
                class="text-base font-semibold text-accent no-underline hover:underline"
              >{{ post.title }}</NuxtLink>
              <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">{{ post.summary }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                <span>{{ post.authorName }}</span>
                <span>{{ relativeTime(post.publishedAt) }}</span>
                <TagChip
                  v-for="tag in post.tags.slice(0, 3)"
                  :key="tag"
                  :label="tag"
                  :to="`/search?q=${encodeURIComponent(tag)}`"
                />
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
