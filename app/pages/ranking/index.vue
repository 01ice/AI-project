<script setup lang="ts">
import type { ProjectListResponse } from '~~/shared/types'

const route = useRoute()

const metric = computed(() => {
  const value = route.query.metric
  return value === 'revenue' || value === 'cost' ? value : 'profit'
})

const tabs = [
  { key: 'profit', label: '利润榜', desc: '按「每月收入 − 每月成本」从高到低排序，只统计填写了每月收入的项目。' },
  { key: 'revenue', label: '收入榜', desc: '按每月收入从高到低排序。' },
  { key: 'cost', label: '成本榜', desc: '按每月成本从低到高排序，看看谁在用最少的钱把事做成。' },
]

const activeTab = computed(() => tabs.find(tab => tab.key === metric.value) ?? tabs[0]!)

const { data, pending } = await useFetch<ProjectListResponse>('/api/projects', {
  query: computed(() => ({ sort: metric.value, pageSize: 20 })),
})

useHead({
  title: '排行榜 · 栈桥',
  meta: [{ name: 'description', content: '栈桥项目排行榜：利润榜、收入榜、成本榜，数据由项目作者自行填写。' }],
})
</script>

<template>
  <div class="w-full">
    <header>
      <h1 class="text-xl font-semibold text-fg-default">排行榜</h1>
      <p class="mt-2 text-sm text-fg-muted">{{ activeTab.desc }}</p>
    </header>

    <nav class="mt-4 flex items-center gap-1 border-b border-border-default">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="{ path: '/ranking', query: tab.key === 'profit' ? {} : { metric: tab.key } }"
        class="-mb-px border-b-2 px-3 py-2 text-sm no-underline"
        :class="metric === tab.key
          ? 'border-accent font-medium text-fg-default'
          : 'border-transparent text-fg-muted hover:text-fg-default'"
      >
        {{ tab.label }}
      </NuxtLink>
    </nav>

    <p v-if="pending" class="py-16 text-center text-sm text-fg-muted">正在加载…</p>

    <p v-else-if="!data?.items.length" class="py-16 text-center text-sm text-fg-muted">
      还没有项目填写这项数据。
    </p>

    <div v-else class="mt-4 overflow-x-auto card">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-canvas-subtle text-xs text-fg-muted">
          <tr>
            <th class="w-12 px-3 py-2 text-right font-medium">#</th>
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
            v-for="(project, index) in data.items"
            :key="project.id"
            class="hover:bg-canvas-subtle"
          >
            <td class="px-3 py-2 text-right text-fg-subtle">{{ index + 1 }}</td>
            <td class="px-3 py-2">
              <NuxtLink :to="`/projects/${project.slug}`" class="font-medium no-underline hover:underline">
                {{ project.title }}
              </NuxtLink>
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

    <p class="mt-3 text-xs text-fg-subtle">
      成本与收益由项目作者自行填写，栈桥不做审计。榜单只统计已填写对应数据的项目。
    </p>
  </div>
</template>
