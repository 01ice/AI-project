<script setup lang="ts">
import type { ManagedProject, ProjectFormPayload } from '~~/shared/types'

useHead({ title: '编辑项目 · 栈桥' })

const route = useRoute()
const slug = route.params.slug as string
const user = useAuthUser()

const { data, error } = await useFetch<{ project: ManagedProject }>(`/api/me/projects/${slug}`)

const errorMessage = ref('')
const busy = ref(false)

if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '项目不存在，或你没有编辑权限',
    fatal: true,
  })
}

const project = data.value.project

const initial: Partial<ProjectFormPayload> = {
  title: project.title,
  summary: project.summary,
  body: project.body,
  coverUrl: project.coverUrl,
  screenshots: project.screenshots,
  categoryId: project.categoryId ?? '',
  repoUrl: project.repoUrl ?? '',
  demoUrl: project.demoUrl ?? '',
  extraLinks: project.extraLinks,
  tagIds: [],
  isAi: project.isAi,
  aiModels: project.aiModels,
  aiHosting: project.aiHosting,
  monthlyCostCny: project.monthlyCostCny,
  monthlyRevenueCny: project.monthlyRevenueCny,
  totalRevenueCny: project.totalRevenueCny,
  revenueModel: project.revenueModel,
  costNote: project.costNote ?? '',
  revenueNote: project.revenueNote ?? '',
}

async function submit(payload: ProjectFormPayload, status: 'draft' | 'pending') {
  busy.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ status: string }>(`/api/projects/${slug}`, {
      method: 'PUT',
      body: { ...payload, status },
    })
    await navigateTo({ path: '/me/projects', query: { result: res.status } })
  }
  catch (err) {
    errorMessage.value = authErrorMessage(err)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[820px]">
    <header class="mb-5">
      <h1 class="text-xl font-semibold text-fg-default">编辑「{{ project.title }}」</h1>
      <p class="mt-2 text-sm text-fg-muted">
        当前状态：<span class="text-fg-default">{{ project.status === 'published' ? '已发布' : project.status === 'draft' ? '草稿' : project.status === 'pending' ? '待审核' : project.status === 'rejected' ? '已驳回' : '已下架' }}</span>
        <span v-if="project.status === 'published'" class="ml-1">· 保存后会重新进入审核</span>
      </p>
      <p
        v-if="project.moderationNote"
        class="mt-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
      >
        审核意见：{{ project.moderationNote }}
      </p>
    </header>

    <p v-if="!user" class="rounded-md border border-border-default bg-canvas p-6 text-center text-sm text-fg-muted">
      请先登录。
    </p>

    <ProjectForm
      v-else
      :initial="initial"
      submit-label="保存并提交审核"
      :busy="busy"
      :error-message="errorMessage"
      @submit="submit"
    />
  </div>
</template>
