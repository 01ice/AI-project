<script setup lang="ts">
import type { ManagedPost, PostStatus } from '~~/shared/types'

definePageMeta({ layout: 'editor' })

useHead({ title: '编辑文章 · 栈桥' })

const route = useRoute()
const slug = route.params.slug as string
const user = useAuthUser()

const { data, error } = await useFetch<{ post: ManagedPost }>(`/api/me/posts/${slug}`)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在或你没有编辑权限', fatal: true })
}

const post = data.value.post

const statusLabels: Record<PostStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
  offline: '已下架',
}
</script>

<template>
  <div v-if="user" class="flex flex-1 flex-col">
    <p
      v-if="post.status !== 'draft'"
      class="border-b border-border-default bg-canvas-subtle px-4 py-2 text-xs text-fg-muted"
    >
      当前状态：<span class="text-fg-default">{{ statusLabels[post.status] }}</span>
      <span v-if="post.status === 'published'" class="ml-1">· 保存后需要重新审核</span>
      <span v-if="post.moderationNote" class="ml-2 text-danger">审核意见：{{ post.moderationNote }}</span>
    </p>

    <PostEditor :initial="post" />
  </div>

  <div v-else class="flex flex-1 items-center justify-center px-4 py-20">
    <div class="card p-6 text-center">
      <p class="text-sm text-fg-muted">请先登录。</p>
      <NuxtLink to="/login" class="mt-3 inline-block text-sm text-accent no-underline hover:underline">
        去登录
      </NuxtLink>
    </div>
  </div>
</template>
