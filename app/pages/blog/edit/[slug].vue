<script setup lang="ts">
import type { ManagedPost, PostStatus } from '~~/shared/types'

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
  <div class="mx-auto max-w-[900px]">
    <header class="mb-5">
      <h1 class="text-xl font-semibold text-fg-default">编辑文章</h1>
      <p class="mt-2 text-sm text-fg-muted">
        当前状态：<span class="text-fg-default">{{ statusLabels[post.status] }}</span>
        <span v-if="post.status === 'published'" class="ml-1">· 保存后需要重新审核</span>
      </p>
      <p
        v-if="post.moderationNote"
        class="mt-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
      >
        审核意见：{{ post.moderationNote }}
      </p>
    </header>

    <p v-if="!user" class="rounded-md border border-border-default bg-canvas p-6 text-center text-sm text-fg-muted">
      请先登录。
    </p>

    <PostEditor v-else :initial="post" />
  </div>
</template>
