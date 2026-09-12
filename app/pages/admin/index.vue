<script setup lang="ts">
import type { AdminProjectItem, AdminTagItem } from '~~/shared/types'

useHead({ title: '审核后台 · 栈桥' })

const user = useAuthUser()
const tab = ref<'projects' | 'tags'>('projects')
const projectStatus = ref<'pending' | 'published' | 'rejected' | 'offline'>('pending')
const busySlug = ref('')
const busyTag = ref('')
const notes = reactive<Record<string, string>>({})
const tagNotes = reactive<Record<string, string>>({})
const message = ref('')

const { data: projectData, refresh: refreshProjects } = await useFetch<{ items: AdminProjectItem[] }>(
  '/api/admin/projects',
  { query: computed(() => ({ status: projectStatus.value })), immediate: !!user.value },
)
const { data: pendingTags, refresh: refreshTags } = await useFetch<{ items: AdminTagItem[] }>(
  '/api/admin/tags',
  { query: { status: 'pending' }, immediate: !!user.value },
)
const { data: summary, refresh: refreshSummary } = await useFetch<{
  pendingProjects: number
  publishedProjects: number
  pendingTags: number
}>('/api/admin/summary', { immediate: !!user.value })

const hostingLabels: Record<string, string> = {
  api: '调用 API',
  self_hosted: '本地部署',
  hybrid: '混合',
}

const tagGroupLabels: Record<string, string> = {
  stack: '技术栈',
  ai_model: '模型与供应商',
  ai_tech: 'AI 技术',
  ai_domain: '应用领域',
}

const projectStatusOptions = [
  { value: 'pending' as const, label: '待审' },
  { value: 'published' as const, label: '已发布' },
  { value: 'rejected' as const, label: '已驳回' },
  { value: 'offline' as const, label: '已下架' },
]

async function refreshAll() {
  await Promise.all([refreshProjects(), refreshTags(), refreshSummary()])
}

async function reviewProject(slug: string, action: 'approve' | 'reject' | 'offline') {
  busySlug.value = slug
  message.value = ''
  try {
    await $fetch(`/api/admin/projects/${slug}/review`, {
      method: 'POST',
      body: { action, note: notes[slug] ?? '' },
    })
    message.value = action === 'approve' ? '已通过并发布' : action === 'reject' ? '已驳回' : '已下架'
    delete notes[slug]
    await refreshAll()
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    busySlug.value = ''
  }
}

async function reviewTag(id: string, action: 'approve' | 'reject') {
  busyTag.value = id
  message.value = ''
  try {
    await $fetch(`/api/admin/tags/${id}/review`, {
      method: 'POST',
      body: { action, note: tagNotes[id] ?? '' },
    })
    message.value = action === 'approve' ? '标签已通过' : '标签已驳回'
    delete tagNotes[id]
    await refreshAll()
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    busyTag.value = ''
  }
}
</script>

<template>
  <div v-if="!user || user.role !== 'admin'" class="mx-auto max-w-[600px] py-16 text-center">
    <p class="text-sm text-fg-muted">审核后台需要管理员权限。</p>
    <NuxtLink to="/" class="mt-3 inline-block text-sm no-underline hover:underline">回到首页</NuxtLink>
  </div>

  <div v-else class="mx-auto max-w-[900px]">
    <header class="mb-4">
      <h1 class="text-xl font-semibold text-fg-default">审核后台</h1>
      <div class="mt-3 flex flex-wrap gap-3 text-xs">
        <span class="rounded-md border border-attention/40 bg-attention/5 px-3 py-1.5 text-attention">
          待审项目 {{ summary?.pendingProjects ?? 0 }}
        </span>
        <span class="rounded-md border border-attention/40 bg-attention/5 px-3 py-1.5 text-attention">
          待审标签 {{ summary?.pendingTags ?? 0 }}
        </span>
        <span class="rounded-md border border-border-default bg-canvas-subtle px-3 py-1.5 text-fg-muted">
          已发布项目 {{ summary?.publishedProjects ?? 0 }}
        </span>
      </div>
    </header>

    <nav class="flex items-center gap-1 border-b border-border-default">
      <button
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-sm"
        :class="tab === 'projects' ? 'border-accent font-medium text-fg-default' : 'border-transparent text-fg-muted hover:text-fg-default'"
        @click="tab = 'projects'"
      >
        项目审核
      </button>
      <button
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-sm"
        :class="tab === 'tags' ? 'border-accent font-medium text-fg-default' : 'border-transparent text-fg-muted hover:text-fg-default'"
        @click="tab = 'tags'"
      >
        标签审核
      </button>

      <div v-if="tab === 'projects'" class="ml-auto flex items-center gap-1 pb-1">
        <button
          v-for="option in projectStatusOptions"
          :key="option.value"
          type="button"
          class="rounded px-2.5 py-1 text-xs"
          :class="projectStatus === option.value
            ? 'bg-canvas-subtle font-medium text-fg-default'
            : 'text-fg-muted hover:text-fg-default'"
          @click="projectStatus = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </nav>

    <p v-if="message" class="mt-3 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ message }}
    </p>

    <!-- 项目审核 -->
    <div v-if="tab === 'projects'" class="mt-4 space-y-4">
      <p v-if="!projectData?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
        没有待审核的项目。
      </p>

      <article
        v-for="item in projectData?.items ?? []"
        :key="item.id"
        class="rounded-md border border-border-default bg-canvas p-4"
      >
        <div class="flex gap-4">
          <img
            :src="item.coverUrl"
            :alt="item.title"
            width="140"
            height="84"
            class="h-[84px] w-36 shrink-0 rounded-md border border-border-muted object-cover"
          >

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base font-semibold text-fg-default">{{ item.title }}</h2>
              <span v-if="item.isAi" class="rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] text-accent">AI</span>
              <span v-if="item.categoryName" class="text-xs text-fg-subtle">{{ item.categoryName }}</span>
            </div>

            <p class="mt-1 text-[13px] leading-5 text-fg-muted">{{ item.summary }}</p>

            <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-fg-muted sm:grid-cols-4">
              <div>
                <dt class="text-fg-subtle">作者</dt>
                <dd class="text-fg-default">
                  {{ item.authorName }}
                  <span v-if="!item.authorEmailVerified" class="text-attention">（邮箱未验证）</span>
                </dd>
              </div>
              <div>
                <dt class="text-fg-subtle">提交时间</dt>
                <dd class="text-fg-default">{{ relativeTime(item.createdAt) }}</dd>
              </div>
              <div v-if="item.isAi">
                <dt class="text-fg-subtle">模型</dt>
                <dd class="text-fg-default">{{ item.aiModels.join(' · ') || '—' }}</dd>
              </div>
              <div v-if="item.isAi && item.aiHosting">
                <dt class="text-fg-subtle">使用方式</dt>
                <dd class="text-fg-default">{{ hostingLabels[item.aiHosting] }}</dd>
              </div>
              <div>
                <dt class="text-fg-subtle">每月成本</dt>
                <dd class="text-fg-default">{{ formatCny(item.monthlyCostCny) }}</dd>
              </div>
              <div>
                <dt class="text-fg-subtle">每月收入</dt>
                <dd class="text-fg-default">{{ formatCny(item.monthlyRevenueCny) }}</dd>
              </div>
            </dl>

            <div v-if="item.tags.length" class="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span class="text-fg-subtle">标签</span>
              <span
                v-for="tag in item.tags"
                :key="tag.slug"
                class="rounded-full border px-2 py-0.5"
                :class="tag.status === 'approved'
                  ? 'border-border-muted text-fg-muted'
                  : 'border-attention/40 text-attention'"
              >
                {{ tag.name }}<template v-if="tag.status !== 'approved'">（待审）</template>
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <a
                v-if="item.repoUrl"
                :href="item.repoUrl"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="rounded-md border border-border-default px-2 py-1 no-underline hover:border-accent hover:text-accent"
              >仓库</a>
              <a
                v-if="item.demoUrl"
                :href="item.demoUrl"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="rounded-md border border-border-default px-2 py-1 no-underline hover:border-accent hover:text-accent"
              >演示</a>
              <NuxtLink
                :to="`/projects/${item.slug}`"
                class="rounded-md border border-border-default px-2 py-1 no-underline hover:border-accent hover:text-accent"
              >查看详情页</NuxtLink>
            </div>
          </div>
        </div>

        <details class="mt-3">
          <summary class="cursor-pointer text-xs text-fg-muted hover:text-accent">展开补充说明与截图</summary>
          <div class="mt-2 rounded-md border border-border-muted bg-canvas-subtle p-3">
            <p v-if="item.note" class="whitespace-pre-wrap text-[13px] leading-6 text-fg-default">{{ item.note }}</p>
            <p v-else class="text-xs text-fg-subtle">作者没有填写补充说明</p>
            <div v-if="item.screenshots.length" class="mt-3 flex flex-wrap gap-2">
              <img
                v-for="shot in item.screenshots"
                :key="shot"
                :src="shot"
                alt="截图"
                class="h-20 rounded-md border border-border-default object-cover"
              >
            </div>
          </div>
        </details>

        <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-border-muted pt-3">
          <input
            v-model="notes[item.slug]"
            placeholder="审核意见（驳回时建议写清楚原因）"
            class="h-8 flex-1 rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
          >
          <button
            v-if="item.status !== 'published'"
            type="button"
            :disabled="busySlug === item.slug"
            class="h-8 rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white disabled:opacity-60"
            @click="reviewProject(item.slug, 'approve')"
          >
            {{ item.status === 'pending' ? '通过并发布' : '恢复发布' }}
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            :disabled="busySlug === item.slug"
            class="h-8 rounded-md border border-danger px-3 text-sm font-medium text-danger disabled:opacity-60"
            @click="reviewProject(item.slug, 'reject')"
          >
            驳回
          </button>
          <button
            v-if="item.status === 'published'"
            type="button"
            :disabled="busySlug === item.slug"
            class="h-8 rounded-md border border-danger px-3 text-sm font-medium text-danger disabled:opacity-60"
            @click="reviewProject(item.slug, 'offline')"
          >
            下架
          </button>
        </div>
      </article>
    </div>

    <!-- 标签审核 -->
    <div v-else class="mt-4 space-y-3">
      <p v-if="!pendingTags?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
        没有待审核的标签。
      </p>

      <div
        v-for="tag in pendingTags?.items ?? []"
        :key="tag.id"
        class="rounded-md border border-border-default bg-canvas p-4"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-fg-default">{{ tag.name }}</span>
          <span class="rounded-full border border-border-muted px-2 py-0.5 text-xs text-fg-muted">
            {{ tagGroupLabels[tag.group] }}
          </span>
          <span class="text-xs text-fg-subtle">
            {{ tag.creatorName ?? '未知' }} 申请于 {{ relativeTime(tag.createdAt) }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <input
            v-model="tagNotes[tag.id]"
            placeholder="审核意见（选填）"
            class="h-8 flex-1 rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
          >
          <button
            type="button"
            :disabled="busyTag === tag.id"
            class="h-8 rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white disabled:opacity-60"
            @click="reviewTag(tag.id, 'approve')"
          >
            通过
          </button>
          <button
            type="button"
            :disabled="busyTag === tag.id"
            class="h-8 rounded-md border border-danger px-3 text-sm font-medium text-danger disabled:opacity-60"
            @click="reviewTag(tag.id, 'reject')"
          >
            驳回
          </button>
        </div>
      </div>
    </div>

    <p class="mt-6 rounded-md border border-border-default bg-canvas-subtle px-3 py-2 text-xs leading-5 text-fg-muted">
      通过后项目立即公开，驳回意见会显示在作者的「我的项目」里。AI 自动审核（DeepSeek + 腾讯云内容安全）
      会在填入 API Key 后接入，届时这里只处理机器拿不准的内容。
    </p>
  </div>
</template>
