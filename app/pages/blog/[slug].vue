<script setup lang="ts">
import type { InteractionState, PostDetail } from '~~/shared/types'

const route = useRoute()
const slug = route.params.slug as string
const user = useAuthUser()

const { data, error } = await useFetch<{ post: PostDetail }>(() => `/api/posts/${slug}`)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在或尚未发布', fatal: true })
}

const post = computed(() => data.value!.post)

const { data: interaction, refresh: refreshInteraction } = await useFetch<InteractionState>(
  '/api/interactions',
  { query: computed(() => ({ targetType: 'post', targetId: post.value.id })) },
)

const liking = ref(false)
const likeError = ref('')

async function toggleLike() {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  liking.value = true
  likeError.value = ''
  try {
    await $fetch('/api/interactions?targetType=post', {
      method: 'POST',
      body: { action: 'like', targetId: post.value.id },
    })
    await refreshInteraction()
  }
  catch (err) {
    likeError.value = authErrorMessage(err)
  }
  finally {
    liking.value = false
  }
}

useHead(() => ({
  title: `${post.value.title} · 栈桥博客`,
  meta: [
    { name: 'description', content: post.value.summary },
    { property: 'og:title', content: post.value.title },
    { property: 'og:description', content: post.value.summary },
    { property: 'og:type', content: 'article' },
  ],
}))
</script>

<template>
  <div class="mx-auto max-w-[760px]">
    <article class="rounded-md border border-border-default bg-canvas">
      <header class="border-b border-border-default p-6">
        <h1 class="text-2xl font-semibold text-fg-default">{{ post.title }}</h1>
        <p class="mt-2 text-sm leading-6 text-fg-muted">{{ post.summary }}</p>

        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span class="inline-flex items-center gap-1">
            <AppAvatar :name="post.authorName" :username="post.authorUsername ?? post.authorName" :size="20" />
            {{ post.authorName }}
          </span>
          <span>{{ formatDate(post.publishedAt) }}</span>
          <span>{{ formatCount(post.viewCount) }} 次阅读</span>
        </div>

        <div v-if="post.tags.length" class="mt-3 flex flex-wrap gap-1.5">
          <TagChip
            v-for="tag in post.tags"
            :key="tag"
            :label="tag"
            :to="`/blog?tag=${encodeURIComponent(tag)}`"
          />
        </div>
      </header>

      <img
        v-if="post.coverUrl"
        :src="post.coverUrl"
        :alt="post.title"
        class="max-h-[320px] w-full border-b border-border-default object-cover"
      >

      <!-- 正文经过与服务端相同的白名单过滤，见 server/utils/markdown.ts -->
      <div class="markdown-body p-6" v-html="post.bodyHtml" />
    </article>

    <section class="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-canvas px-5 py-3">
      <button
        type="button"
        :disabled="liking"
        class="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-sm disabled:opacity-60"
        :class="interaction?.liked
          ? 'border-accent bg-accent-subtle font-medium text-accent'
          : 'border-border-default hover:border-accent hover:text-accent'"
        @click="toggleLike"
      >
        ♥ {{ interaction?.liked ? '已点赞' : '点赞' }}
        <span v-if="interaction?.likeCount" class="text-xs">({{ interaction.likeCount }})</span>
      </button>

      <span class="text-xs text-fg-subtle">
        {{ interaction?.commentCount ?? 0 }} 条评论
      </span>

      <p v-if="likeError" class="text-xs text-danger">{{ likeError }}</p>

      <div class="ml-auto w-40">
        <ReportButton target-type="post" :target-id="post.id" />
      </div>
    </section>

    <div class="mt-4">
      <CommentSection target-type="post" :target-id="post.id" />
    </div>

    <section v-if="post.projects.length" class="mt-4 rounded-md border border-border-default bg-canvas p-5">
      <h2 class="text-sm font-semibold text-fg-default">涉及的项目</h2>
      <ul class="mt-3 space-y-2">
        <li v-for="project in post.projects" :key="project.slug">
          <NuxtLink
            :to="`/projects/${project.slug}`"
            class="inline-flex items-center gap-2 text-sm no-underline hover:underline"
          >
            <span class="rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent">项目</span>
            {{ project.name }}
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="mt-4 flex items-center gap-3 text-sm">
      <NuxtLink to="/blog" class="no-underline hover:underline">← 返回博客列表</NuxtLink>
      <NuxtLink to="/projects" class="ml-auto text-fg-muted no-underline hover:text-accent hover:underline">
        去看看项目 →
      </NuxtLink>
    </div>
  </div>
</template>
