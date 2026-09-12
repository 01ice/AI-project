<script setup lang="ts">
import type { MyPostItem, PostStatus } from '~~/shared/types'

useHead({ title: '我的文章 · 栈桥' })

const route = useRoute()
const user = useAuthUser()

const { data, refresh } = await useFetch<{ items: MyPostItem[] }>('/api/me/posts', {
  immediate: !!user.value,
})

const notice = computed(() => {
  const result = route.query.result
  if (result === 'published') return '已发布，文章现在可以在博客里看到了。'
  if (result === 'pending') return '已提交审核，通过后会出现在博客里。'
  return ''
})

const pendingDelete = ref('')
const deleting = ref('')
const deleteMessage = ref('')

async function remove(slug: string) {
  deleting.value = slug
  deleteMessage.value = ''
  try {
    await $fetch(`/api/me/posts/${slug}`, { method: 'DELETE' })
    deleteMessage.value = '文章已删除'
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

const statusLabels: Record<PostStatus, { text: string, class: string }> = {
  draft: { text: '草稿', class: 'border-border-default text-fg-muted' },
  pending: { text: '待审核', class: 'border-attention/40 text-attention' },
  published: { text: '已发布', class: 'border-success/40 text-success' },
  rejected: { text: '已驳回', class: 'border-danger/40 text-danger' },
  offline: { text: '已下架', class: 'border-border-default text-fg-subtle' },
}

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me/posts' } })
  }
  else {
    await refresh()
  }
})
</script>

<template>
  <div class="mx-auto max-w-[900px]">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold text-fg-default">我的文章</h1>
      <NuxtLink
        to="/blog/new"
        class="ml-auto inline-flex h-8 items-center rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white no-underline hover:bg-accent/90"
      >
        写新文章
      </NuxtLink>
    </header>

    <p v-if="notice" class="mb-4 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ notice }}
    </p>
    <p v-if="deleteMessage" class="mb-4 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ deleteMessage }}
    </p>

    <p v-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
      还没有写过文章，<NuxtLink to="/blog/new" class="no-underline hover:underline">现在开始写第一篇</NuxtLink>。
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="post in data.items"
        :key="post.id"
        class="flex gap-3 rounded-md border border-border-default bg-canvas p-3"
      >
        <img
          v-if="post.coverUrl"
          :src="post.coverUrl"
          :alt="post.title"
          width="112"
          height="72"
          class="h-[72px] w-28 shrink-0 rounded-md border border-border-muted object-cover"
        >

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border px-2 py-0.5 text-xs" :class="statusLabels[post.status].class">
              {{ statusLabels[post.status].text }}
            </span>
            <h2 class="truncate text-base font-semibold text-fg-default">{{ post.title }}</h2>
          </div>

          <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">{{ post.summary }}</p>

          <p v-if="post.moderationNote" class="mt-1 text-xs text-danger">
            审核意见：{{ post.moderationNote }}
          </p>

          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            <span>更新于 {{ relativeTime(post.updatedAt) }}</span>
            <span v-if="post.status === 'published'">{{ formatCount(post.viewCount) }} 次阅读</span>
            <template v-if="post.projects.length">
              <span class="text-fg-subtle">关联项目</span>
              <NuxtLink
                v-for="project in post.projects"
                :key="project.slug"
                :to="`/projects/${project.slug}`"
                class="rounded-full border border-border-muted px-2 py-0.5 no-underline hover:border-accent hover:text-accent"
              >
                {{ project.name }}
              </NuxtLink>
            </template>
          </div>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-2 text-sm">
          <NuxtLink :to="`/blog/edit/${post.slug}`" class="text-accent no-underline hover:underline">
            编辑
          </NuxtLink>
          <NuxtLink
            v-if="post.status === 'published'"
            :to="`/blog/${post.slug}`"
            class="text-fg-muted no-underline hover:text-accent hover:underline"
          >
            查看
          </NuxtLink>
          <template v-if="post.source === 'editor'">
            <button
              v-if="pendingDelete !== post.slug"
              type="button"
              class="text-fg-muted hover:text-danger"
              @click="pendingDelete = post.slug"
            >
              删除
            </button>
            <template v-else>
              <button
                type="button"
                :disabled="deleting === post.slug"
                class="font-medium text-danger disabled:opacity-60"
                @click="remove(post.slug)"
              >
                {{ deleting === post.slug ? '删除中…' : '确认删除' }}
              </button>
              <button type="button" class="text-fg-muted hover:text-fg-default" @click="pendingDelete = ''">
                取消
              </button>
            </template>
          </template>
          <span v-else class="text-xs text-fg-subtle" title="来自仓库里的 Markdown 文件">仓库文章</span>
        </div>
      </li>
    </ul>
  </div>
</template>
