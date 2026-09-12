<script setup lang="ts">
import type { CategoryItem, ProjectListResponse, TagItem } from '~~/shared/types'

const { data: featured } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { sort: 'hot', pageSize: 3 },
})
const { data: latest } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { sort: 'latest', pageSize: 6 },
})
const { data: categories } = await useFetch<CategoryItem[]>('/api/categories')
const { data: tags } = await useFetch<TagItem[]>('/api/tags', { query: { limit: 18 } })

useHead({
  title: '栈桥 · 发现开发者的项目',
  meta: [
    {
      name: 'description',
      content: '栈桥是一个面向中文开发者的项目收录与分享社区，发现好项目，也分享你自己的作品。',
    },
  ],
})
</script>

<template>
  <div>
    <section class="rounded-md border border-border-default bg-canvas-subtle px-6 py-8">
      <h1 class="text-2xl font-semibold text-fg-default">
        发现值得一看的项目
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">
        栈桥收集开发者做出来的东西——工具、应用、开源库。每个项目都经过审核，
        你也可以把作品放上来，让更多人看到。
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/projects"
          class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white no-underline hover:bg-accent/90"
        >
          浏览全部项目
        </NuxtLink>
        <button
          type="button"
          disabled
          title="发布功能将在 D4 上线"
          class="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-border-default bg-canvas px-4 text-sm font-medium text-fg-default opacity-50"
        >
          发布我的项目
        </button>
      </div>
    </section>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="space-y-6">
        <section>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-base font-semibold text-fg-default">热门项目</h2>
            <NuxtLink to="/projects?sort=hot" class="text-xs no-underline hover:underline">查看全部 →</NuxtLink>
          </div>
          <div class="space-y-3">
            <ProjectCard v-for="project in featured?.items ?? []" :key="project.id" :project="project" />
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-base font-semibold text-fg-default">最新收录</h2>
            <NuxtLink to="/projects" class="text-xs no-underline hover:underline">查看全部 →</NuxtLink>
          </div>
          <div class="space-y-3">
            <ProjectCard v-for="project in latest?.items ?? []" :key="project.id" :project="project" />
          </div>
        </section>
      </div>

      <aside class="space-y-6">
        <section class="rounded-md border border-border-default bg-canvas">
          <h2 class="border-b border-border-default px-4 py-2.5 text-sm font-semibold text-fg-default">
            分类
          </h2>
          <ul class="p-2">
            <li v-for="category in categories ?? []" :key="category.id">
              <NuxtLink
                :to="`/projects?category=${category.slug}`"
                class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-fg-default no-underline hover:bg-canvas-subtle hover:text-accent"
              >
                <span>{{ category.name }}</span>
                <span class="text-xs text-fg-subtle">{{ category.projectCount }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="rounded-md border border-border-default bg-canvas">
          <h2 class="border-b border-border-default px-4 py-2.5 text-sm font-semibold text-fg-default">
            热门标签
          </h2>
          <div class="flex flex-wrap gap-1.5 p-3">
            <TagChip
              v-for="tag in tags ?? []"
              :key="tag.id"
              :label="tag.name"
              :to="`/projects?tag=${tag.slug}`"
            />
          </div>
        </section>

        <section class="rounded-md border border-border-default bg-canvas-subtle px-4 py-3 text-xs leading-5 text-fg-muted">
          <p class="font-semibold text-fg-default">这个站还在建设</p>
          <p class="mt-1">
            注册登录、发布项目、评论互动正在开发中，当前展示的是示例数据。
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>
