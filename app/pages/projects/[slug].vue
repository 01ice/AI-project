<script setup lang="ts">
import type { CommentItem, ProjectDetail } from '~~/shared/types'

const route = useRoute()
const slug = route.params.slug as string

const { data, error } = await useFetch<{ project: ProjectDetail, comments: CommentItem[] }>(
  () => `/api/projects/${slug}`,
)

if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '项目不存在或尚未公开',
    fatal: true,
  })
}

const project = computed(() => data.value!.project)
const comments = computed(() => data.value!.comments)

useHead(() => ({
  title: `${project.value.title} · 栈桥`,
  meta: [
    { name: 'description', content: project.value.summary },
    { property: 'og:title', content: project.value.title },
    { property: 'og:description', content: project.value.summary },
    { property: 'og:image', content: project.value.coverUrl },
  ],
}))
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
    <div class="space-y-6">
      <article class="rounded-md border border-border-default bg-canvas">
        <div class="border-b border-border-default p-5">
          <div class="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <TagChip v-if="project.categoryName" :label="project.categoryName" :to="`/projects?category=${project.categorySlug}`" />
            <span>收录于 {{ formatDate(project.publishedAt) }}</span>
          </div>

          <h1 class="mt-2 text-2xl font-semibold text-fg-default">{{ project.title }}</h1>
          <p class="mt-2 text-sm leading-6 text-fg-muted">{{ project.summary }}</p>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <a
              v-if="project.repoUrl"
              :href="project.repoUrl"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-sm no-underline hover:border-accent hover:text-accent"
            >
              源代码
            </a>
            <a
              v-if="project.demoUrl"
              :href="project.demoUrl"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-sm no-underline hover:border-accent hover:text-accent"
            >
              在线体验
            </a>
            <span
              v-for="link in project.extraLinks"
              :key="link.url"
              class="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-sm text-fg-muted"
            >
              {{ link.label }}
            </span>
          </div>
        </div>

        <img
          :src="project.coverUrl"
          :alt="project.title"
          class="max-h-[360px] w-full border-b border-border-default object-cover"
        >

        <div class="p-5">
          <!-- 正文由服务端渲染并经过白名单过滤，见 server/utils/markdown.ts -->
          <div class="markdown-body" v-html="project.bodyHtml" />

          <div v-if="project.screenshots.length" class="mt-6 grid grid-cols-2 gap-3">
            <img
              v-for="shot in project.screenshots"
              :key="shot"
              :src="shot"
              alt="项目截图"
              loading="lazy"
              class="rounded-md border border-border-default"
            >
          </div>
        </div>
      </article>

      <section class="rounded-md border border-border-default bg-canvas">
        <h2 class="border-b border-border-default px-5 py-3 text-sm font-semibold text-fg-default">
          评论 {{ project.commentCount }}
        </h2>

        <div class="border-b border-border-default bg-canvas-subtle px-5 py-3">
          <textarea
            rows="3"
            disabled
            placeholder="登录后可以参与讨论（D2 上线）"
            class="w-full cursor-not-allowed rounded-md border border-border-default bg-canvas px-3 py-2 text-sm placeholder:text-fg-subtle"
          />
          <div class="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled
              class="h-8 cursor-not-allowed rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white opacity-50"
            >
              发表评论
            </button>
            <span class="text-xs text-fg-muted">评论功能将在 D6 上线</span>
          </div>
        </div>

        <ul v-if="comments.length" class="divide-y divide-border-muted">
          <li v-for="comment in comments" :key="comment.id" class="px-5 py-4">
            <div class="flex gap-3">
              <AppAvatar :name="comment.authorName" :username="comment.authorUsername" :size="28" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 text-xs">
                  <span class="font-medium text-fg-default">{{ comment.authorName }}</span>
                  <span class="text-fg-subtle">{{ relativeTime(comment.createdAt) }}</span>
                </div>
                <p class="mt-1 text-sm leading-6 text-fg-default">{{ comment.content }}</p>

                <ul v-if="comment.replies.length" class="mt-3 space-y-3 border-l-2 border-border-muted pl-4">
                  <li v-for="reply in comment.replies" :key="reply.id" class="flex gap-3">
                    <AppAvatar :name="reply.authorName" :username="reply.authorUsername" :size="24" />
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="font-medium text-fg-default">{{ reply.authorName }}</span>
                        <span v-if="reply.replyToName" class="text-fg-subtle">回复 {{ reply.replyToName }}</span>
                        <span class="text-fg-subtle">{{ relativeTime(reply.createdAt) }}</span>
                      </div>
                      <p class="mt-1 text-sm leading-6 text-fg-default">{{ reply.content }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </li>
        </ul>

        <p v-else class="px-5 py-10 text-center text-sm text-fg-muted">
          还没有评论，来做第一个。
        </p>
      </section>
    </div>

    <aside class="space-y-4">
      <section class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">作者</h2>
        <div class="mt-3 flex items-center gap-3">
          <AppAvatar :name="project.authorName" :username="project.authorUsername" :size="36" :image-url="project.authorAvatarUrl" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-fg-default">{{ project.authorName }}</p>
            <p class="truncate text-xs text-fg-muted">@{{ project.authorUsername }}</p>
          </div>
        </div>
        <p v-if="project.authorBio" class="mt-3 text-xs leading-5 text-fg-muted">
          {{ project.authorBio }}
        </p>
      </section>

      <section class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">技术栈</h2>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <TagChip
            v-for="tag in project.tags"
            :key="tag.slug"
            :label="tag.name"
            :to="`/projects?tag=${tag.slug}`"
          />
        </div>
      </section>

      <section class="rounded-md border border-border-default bg-canvas p-4">
        <div class="flex items-center justify-between text-sm">
          <AppStat icon="eye" :value="project.viewCount" label="浏览" />
          <AppStat icon="heart" :value="project.likeCount" label="点赞" />
          <AppStat icon="star" :value="project.favoriteCount" label="收藏" />
        </div>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            disabled
            title="点赞功能将在 D6 上线"
            class="h-8 flex-1 cursor-not-allowed rounded-md border border-border-default text-sm opacity-50"
          >
            点赞
          </button>
          <button
            type="button"
            disabled
            title="收藏功能将在 D6 上线"
            class="h-8 flex-1 cursor-not-allowed rounded-md border border-border-default text-sm opacity-50"
          >
            收藏
          </button>
        </div>
        <button
          type="button"
          disabled
          title="举报功能将在 D6 上线"
          class="mt-2 h-8 w-full cursor-not-allowed rounded-md text-xs text-fg-muted opacity-60"
        >
          举报该项目
        </button>
      </section>
    </aside>
  </div>
</template>
