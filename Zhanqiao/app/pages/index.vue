<script setup lang="ts">
import type { CategoryItem, ProjectListResponse, TagItem } from '~~/shared/types'

const { data: featured } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { sort: 'hot', pageSize: 3 },
})
const { data: latest } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { sort: 'latest', pageSize: 6 },
})
const { data: topProjects } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { withMetrics: '1', sort: 'profit', pageSize: 6 },
})
const { data: categories } = await useFetch<CategoryItem[]>('/api/categories')
const { data: tags } = await useFetch<TagItem[]>('/api/tags', { query: { limit: 18 } })

useHead({
  title: '栈桥 · 发现 AI 项目与开发者的作品',
  meta: [
    {
      name: 'description',
      content: '栈桥以 AI 项目为主的开发者社区：每个项目公开用到的模型、每月成本与收益，发现好项目，也分享你自己的作品。',
    },
  ],
})
</script>

<template>
  <div>
    <section class="card bg-canvas-subtle px-6 py-8">
      <h1 class="text-2xl font-semibold text-fg-default">
        发现值得一看的项目，看清它背后的成本
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">
        栈桥收集开发者做出来的东西，以 AI 项目为主。每个 AI 项目都会公开用到的模型、
        每月成本和每月收益，让你在动手之前先看清这笔账。
      </p>
      <div class="mt-3 flex flex-wrap gap-2 text-xs text-fg-muted">
        <span class="rounded-full border border-border-default bg-canvas px-2.5 py-1">模型</span>
        <span class="rounded-full border border-border-default bg-canvas px-2.5 py-1">月成本</span>
        <span class="rounded-full border border-border-default bg-canvas px-2.5 py-1">月收益</span>
        <span class="rounded-full border border-border-default bg-canvas px-2.5 py-1">数据由作者提供</span>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/projects"
          class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white no-underline hover:bg-accent/90"
        >
          浏览全部项目
        </NuxtLink>
        <NuxtLink
          to="/projects?ai=1"
          class="inline-flex h-8 items-center card px-4 text-sm font-medium text-fg-default no-underline hover:border-accent hover:text-accent"
        >
          只看 AI 项目
        </NuxtLink>
        <NuxtLink
          to="/projects/new"
          class="inline-flex h-8 items-center card px-4 text-sm font-medium text-fg-default no-underline hover:border-accent hover:text-accent"
        >
          发布我的项目
        </NuxtLink>
      </div>
    </section>

    <section class="mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-semibold text-fg-default">项目收支速览</h2>
        <div class="flex items-center gap-3 text-xs">
          <NuxtLink to="/projects?ai=1" class="no-underline hover:underline">只看 AI 项目 →</NuxtLink>
          <NuxtLink to="/ranking" class="no-underline hover:underline">完整排行榜 →</NuxtLink>
        </div>
      </div>

      <div class="overflow-x-auto card">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="bg-canvas-subtle text-xs text-fg-muted">
            <tr>
              <th class="px-3 py-2 text-left font-medium">项目</th>
              <th class="px-3 py-2 text-left font-medium">模型 / 分类</th>
              <th class="px-3 py-2 text-right font-medium">每月成本</th>
              <th class="px-3 py-2 text-right font-medium">每月收入</th>
              <th class="px-3 py-2 text-right font-medium">总收入</th>
              <th class="px-3 py-2 text-right font-medium">月净利</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-muted">
            <tr
              v-for="project in topProjects?.items ?? []"
              :key="project.id"
              class="hover:bg-canvas-subtle"
            >
              <td class="px-3 py-2">
                <NuxtLink
                  :to="`/projects/${project.slug}`"
                  class="font-medium no-underline hover:underline"
                >{{ project.title }}</NuxtLink>
                <span
                  v-if="project.metrics.isAi"
                  class="ml-2 rounded-full bg-accent-subtle px-1.5 py-0.5 text-[11px] text-accent"
                >AI</span>
              </td>
              <td class="px-3 py-2 text-xs text-fg-muted">
                {{ project.metrics.models.length ? project.metrics.models.join(' · ') : (project.categoryName ?? '—') }}
              </td>
              <td class="px-3 py-2 text-right">{{ formatCny(project.metrics.monthlyCostCny) }}</td>
              <td class="px-3 py-2 text-right">{{ formatCny(project.metrics.monthlyRevenueCny) }}</td>
              <td class="px-3 py-2 text-right">{{ formatCny(project.metrics.totalRevenueCny) }}</td>
              <td
                class="px-3 py-2 text-right font-medium"
                :class="(monthlyProfit(project.metrics) ?? 0) > 0 ? 'text-success' : 'text-fg-muted'"
              >
                {{ formatCny(monthlyProfit(project.metrics)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-xs text-fg-subtle">
        成本与收益由项目作者自行填写，栈桥不做审计，仅供参照。
      </p>
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
        <section class="card">
          <h2 class="border-b border-border-muted px-4 py-3 text-sm font-semibold text-fg-default">
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

        <section class="card">
          <h2 class="border-b border-border-muted px-4 py-3 text-sm font-semibold text-fg-default">
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

        <section class="card bg-canvas-subtle p-4">
          <p class="text-sm font-semibold text-fg-default">怎么用栈桥</p>
          <ul class="mt-2 space-y-1.5 text-xs leading-5 text-fg-muted">
            <li>· 浏览项目，按分类、技术栈或关键词筛选</li>
            <li>· 注册后发布自己的项目，或写下做法与成本账</li>
            <li>· 在排行榜里横向对比模型、成本与收益</li>
          </ul>
          <div class="mt-3 flex flex-wrap gap-2">
            <NuxtLink to="/projects/new" class="btn btn-primary btn-sm no-underline">发布项目</NuxtLink>
            <NuxtLink to="/blog/new" class="btn btn-secondary btn-sm no-underline">写文章</NuxtLink>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
