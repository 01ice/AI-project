<script setup lang="ts">
import type { PublicProfile } from '~~/shared/types'

const route = useRoute()
const username = route.params.username as string

const { data, error } = await useFetch<{ profile: PublicProfile }>(() => `/api/users/${username}`)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: '用户不存在', fatal: true })
}

const profile = computed(() => data.value!.profile)

useHead(() => ({
  title: `${profile.value.nickname} 的项目与文章 · 栈桥`,
  meta: [
    {
      name: 'description',
      content: `${profile.value.nickname} 在栈桥发布的 ${profile.value.projectCount} 个项目与 ${profile.value.postCount} 篇文章。`,
    },
  ],
}))
</script>

<template>
  <div class="mx-auto max-w-[900px]">
    <section class="rounded-md border border-border-default bg-canvas p-5">
      <div class="flex flex-wrap items-center gap-4">
        <AppAvatar
          :name="profile.nickname"
          :username="profile.username"
          :size="64"
          :image-url="profile.avatarUrl"
        />
        <div class="min-w-0">
          <h1 class="text-xl font-semibold text-fg-default">
            {{ profile.nickname }}
            <span
              v-if="profile.role === 'admin'"
              class="ml-2 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent"
            >管理员</span>
          </h1>
          <p class="mt-0.5 text-sm text-fg-muted">@{{ profile.username }}</p>
          <p v-if="profile.bio" class="mt-2 max-w-xl text-sm leading-6 text-fg-default">{{ profile.bio }}</p>
        </div>
      </div>

      <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border-muted pt-4 text-sm">
        <div class="flex items-center gap-2">
          <dt class="text-fg-muted">项目</dt>
          <dd class="font-medium text-fg-default">{{ profile.projectCount }}</dd>
        </div>
        <div class="flex items-center gap-2">
          <dt class="text-fg-muted">文章</dt>
          <dd class="font-medium text-fg-default">{{ profile.postCount }}</dd>
        </div>
        <div class="flex items-center gap-2">
          <dt class="text-fg-muted">项目浏览</dt>
          <dd class="font-medium text-fg-default">{{ formatCount(profile.totalViews) }}</dd>
        </div>
        <div class="flex items-center gap-2">
          <dt class="text-fg-muted">加入于</dt>
          <dd class="text-fg-default">{{ formatDate(profile.joinedAt) }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="profile.projects.length" class="mt-6">
      <h2 class="mb-3 text-base font-semibold text-fg-default">
        项目 <span class="text-sm font-normal text-fg-muted">{{ profile.projects.length }}</span>
      </h2>
      <div class="space-y-3">
        <ProjectCard v-for="project in profile.projects" :key="project.id" :project="project" />
      </div>
    </section>

    <section v-if="profile.posts.length" class="mt-6">
      <h2 class="mb-3 text-base font-semibold text-fg-default">
        文章 <span class="text-sm font-normal text-fg-muted">{{ profile.posts.length }}</span>
      </h2>
      <ul class="space-y-3">
        <li
          v-for="post in profile.posts"
          :key="post.id"
          class="flex gap-3 rounded-md border border-border-default bg-canvas p-3"
        >
          <img
            v-if="post.coverUrl"
            :src="post.coverUrl"
            :alt="post.title"
            width="96"
            height="64"
            loading="lazy"
            class="h-16 w-24 shrink-0 rounded-md border border-border-muted object-cover"
          >
          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="`/blog/${post.slug}`"
              class="text-base font-semibold text-accent no-underline hover:underline"
            >{{ post.title }}</NuxtLink>
            <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">{{ post.summary }}</p>
            <p class="mt-2 text-xs text-fg-subtle">
              {{ relativeTime(post.publishedAt) }} · {{ formatCount(post.viewCount) }} 次阅读
            </p>
          </div>
        </li>
      </ul>
    </section>

    <p
      v-if="!profile.projects.length && !profile.posts.length"
      class="mt-6 rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted"
    >
      这位用户还没有公开的项目或文章。
    </p>
  </div>
</template>
