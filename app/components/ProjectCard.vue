<script setup lang="ts">
import type { ProjectListItem } from '~~/shared/types'

defineProps<{ project: ProjectListItem }>()
</script>

<template>
  <article class="flex gap-3 rounded-md border border-border-default bg-canvas p-3 transition-colors hover:border-fg-subtle">
    <NuxtLink :to="`/projects/${project.slug}`" class="shrink-0">
      <img
        :src="project.coverUrl"
        :alt="project.title"
        width="112"
        height="72"
        loading="lazy"
        class="h-[72px] w-28 rounded-md border border-border-muted object-cover"
      >
    </NuxtLink>

    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/projects/${project.slug}`"
          class="truncate text-base font-semibold text-accent no-underline hover:underline"
        >
          {{ project.title }}
        </NuxtLink>
        <TagChip v-if="project.categoryName" :label="project.categoryName" />
      </div>

      <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">
        {{ project.summary }}
      </p>

      <AiMeta v-if="project.ai.isAi" :ai="project.ai" class="mt-2" />

      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
        <TagChip
          v-for="tag in project.tags.slice(0, 3)"
          :key="tag.slug"
          :label="tag.name"
          :to="`/projects?tag=${tag.slug}`"
        />
      </div>

      <div class="mt-2 flex items-center gap-3 text-xs text-fg-muted">
        <span class="inline-flex items-center gap-1">
          <AppAvatar :name="project.authorName" :username="project.authorUsername" :size="16" :image-url="project.authorAvatarUrl" />
          {{ project.authorName }}
        </span>
        <AppStat icon="heart" :value="project.likeCount" label="点赞" />
        <AppStat icon="star" :value="project.favoriteCount" label="收藏" />
        <AppStat icon="comment" :value="project.commentCount" label="评论" />
        <span class="ml-auto">{{ relativeTime(project.publishedAt) }}</span>
      </div>
    </div>
  </article>
</template>
