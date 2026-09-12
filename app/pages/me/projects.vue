<script setup lang="ts">
import type { MyProjectItem, ProjectStatus } from '~~/shared/types'

useHead({ title: '我的项目 · 栈桥' })

const route = useRoute()
const user = useAuthUser()

const { data, refresh } = await useFetch<{ items: MyProjectItem[] }>('/api/me/projects', {
  immediate: !!user.value,
})

const notice = computed(() => {
  const result = route.query.result
  if (result === 'published') return '已发布。管理员发布的项目会直接上线。'
  if (result === 'pending') return '已提交，等待审核通过后公开显示。'
  if (result === 'draft') return '已存为草稿，只有你自己能看到。'
  return ''
})

const pendingDelete = ref('')
const deleting = ref('')
const deleteMessage = ref('')

async function remove(slug: string) {
  deleting.value = slug
  deleteMessage.value = ''
  try {
    await $fetch(`/api/me/projects/${slug}`, { method: 'DELETE' })
    deleteMessage.value = '项目已删除'
    pendingDelete.value = ''
    await refresh()
  }
  catch (err) {
    deleteMessage.value = authErrorMessage(err)
  }
  finally {
    deleting.value = ''
  }
}

const statusLabels: Record<ProjectStatus, { text: string, class: string }> = {
  draft: { text: '草稿', class: 'border-border-default text-fg-muted' },
  pending: { text: '待审核', class: 'border-attention/40 text-attention' },
  published: { text: '已发布', class: 'border-success/40 text-success' },
  rejected: { text: '已驳回', class: 'border-danger/40 text-danger' },
  offline: { text: '已下架', class: 'border-border-default text-fg-subtle' },
}

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me/projects' } })
  }
  else {
    await refresh()
  }
})
</script>

<template>
  <div class="mx-auto max-w-[900px]">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold text-fg-default">我的项目</h1>
      <NuxtLink
        to="/projects/new"
        class="ml-auto inline-flex h-8 items-center rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white no-underline hover:bg-accent/90"
      >
        发布新项目
      </NuxtLink>
    </header>

    <p
      v-if="notice"
      class="mb-4 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success"
    >
      {{ notice }}
    </p>
    <p
      v-if="deleteMessage"
      class="mb-4 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success"
    >
      {{ deleteMessage }}
    </p>

    <p v-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
      还没有发布过项目，<NuxtLink to="/projects/new" class="no-underline hover:underline">现在去发布第一个</NuxtLink>。
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="project in data.items"
        :key="project.id"
        class="flex gap-3 rounded-md border border-border-default bg-canvas p-3"
      >
        <img
          :src="project.coverUrl"
          :alt="project.title"
          width="112"
          height="72"
          class="h-[72px] w-28 shrink-0 rounded-md border border-border-muted object-cover"
        >

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full border px-2 py-0.5 text-xs"
              :class="statusLabels[project.status].class"
            >{{ statusLabels[project.status].text }}</span>
            <h2 class="truncate text-base font-semibold text-fg-default">{{ project.title }}</h2>
            <span v-if="project.categoryName" class="text-xs text-fg-subtle">{{ project.categoryName }}</span>
          </div>

          <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">{{ project.summary }}</p>

          <p v-if="project.moderationNote" class="mt-1 text-xs text-danger">
            审核意见：{{ project.moderationNote }}
          </p>

          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            <span>更新于 {{ relativeTime(project.updatedAt) }}</span>
            <template v-if="project.status === 'published'">
              <span>{{ formatCount(project.viewCount) }} 浏览</span>
              <span>{{ formatCount(project.likeCount) }} 点赞</span>
              <span>{{ formatCount(project.commentCount) }} 评论</span>
            </template>
          </div>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-2 text-sm">
          <NuxtLink
            :to="`/projects/edit/${project.slug}`"
            class="text-accent no-underline hover:underline"
          >
            编辑
          </NuxtLink>
          <NuxtLink
            v-if="project.status === 'published'"
            :to="`/projects/${project.slug}`"
            class="text-fg-muted no-underline hover:text-accent hover:underline"
          >
            查看
          </NuxtLink>
          <button
            v-if="pendingDelete !== project.slug"
            type="button"
            class="text-fg-muted hover:text-danger"
            @click="pendingDelete = project.slug"
          >
            删除
          </button>
          <template v-else>
            <button
              type="button"
              :disabled="deleting === project.slug"
              class="font-medium text-danger disabled:opacity-60"
              @click="remove(project.slug)"
            >
              {{ deleting === project.slug ? '删除中…' : '确认删除' }}
            </button>
            <button type="button" class="text-fg-muted hover:text-fg-default" @click="pendingDelete = ''">
              取消
            </button>
          </template>
        </div>
      </li>
    </ul>
  </div>
</template>
