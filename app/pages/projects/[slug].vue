<script setup lang="ts">
import type { InteractionState, ProjectDetail } from '~~/shared/types'

const route = useRoute()
const slug = route.params.slug as string
const user = useAuthUser()

const { data, error } = await useFetch<{ project: ProjectDetail }>(() => `/api/projects/${slug}`)

if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '项目不存在或尚未公开',
    fatal: true,
  })
}

const project = computed(() => data.value!.project)

const { data: interaction, refresh: refreshInteraction } = await useFetch<InteractionState>(
  '/api/interactions',
  { query: computed(() => ({ targetType: 'project', targetId: project.value.id })) },
)

const busyAction = ref<'like' | 'favorite' | ''>('')
const actionError = ref('')

async function toggleAction(action: 'like' | 'favorite') {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  busyAction.value = action
  actionError.value = ''
  try {
    await $fetch(`/api/interactions?targetType=project`, {
      method: 'POST',
      body: { action, targetId: project.value.id },
    })
    await refreshInteraction()
  }
  catch (err) {
    actionError.value = authErrorMessage(err)
  }
  finally {
    busyAction.value = ''
  }
}

const likeCount = computed(() => interaction.value?.likeCount ?? project.value.likeCount)
const favoriteCount = computed(() => interaction.value?.favoriteCount ?? project.value.favoriteCount)
const commentCount = computed(() => interaction.value?.commentCount ?? project.value.commentCount)

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

          <MetricsBar :metrics="project.metrics" :max-models="3" class="mt-3" />

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
          <div v-if="project.bodyHtml" class="rounded-md border border-border-default bg-canvas-subtle p-4">
            <h2 class="text-xs font-semibold text-fg-muted">补充说明</h2>
            <!-- 由服务端渲染并经过白名单过滤，见 server/utils/markdown.ts -->
            <div class="markdown-body mt-2" v-html="project.bodyHtml" />
          </div>

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

      <section v-if="project.relatedPosts.length" class="rounded-md border border-border-default bg-canvas">
        <div class="flex items-center justify-between border-b border-border-default px-5 py-3">
          <h2 class="text-sm font-semibold text-fg-default">相关文章 {{ project.relatedPosts.length }}</h2>
          <NuxtLink to="/blog" class="text-xs no-underline hover:underline">全部文章 →</NuxtLink>
        </div>
        <ul class="divide-y divide-border-muted">
          <li v-for="post in project.relatedPosts" :key="post.id" class="px-5 py-3">
            <NuxtLink
              :to="`/blog/${post.slug}`"
              class="text-sm font-medium text-accent no-underline hover:underline"
            >
              {{ post.title }}
            </NuxtLink>
            <p class="mt-1 line-clamp-2 text-xs leading-5 text-fg-muted">{{ post.summary }}</p>
            <p class="mt-1 text-xs text-fg-subtle">
              {{ post.authorName }} · {{ relativeTime(post.publishedAt) }}
            </p>
          </li>
        </ul>
      </section>

      <CommentSection target-type="project" :target-id="project.id" />
    </div>

    <aside class="space-y-4">
      <section v-if="project.metrics.isAi" class="rounded-md border border-border-default bg-canvas p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-fg-default">AI 信息</h2>
          <span class="rounded-full bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent">AI 项目</span>
        </div>

        <dl class="mt-3 space-y-2 text-xs">
          <div>
            <dt class="text-fg-muted">使用模型</dt>
            <dd class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="model in project.metrics.models"
                :key="model"
                class="rounded-full border border-border-muted px-2 py-0.5 text-fg-default"
              >{{ model }}</span>
              <span v-if="!project.metrics.models.length" class="text-fg-subtle">未填写</span>
            </dd>
          </div>
          <div v-if="project.metrics.hosting" class="flex items-center justify-between">
            <dt class="text-fg-muted">使用方式</dt>
            <dd class="text-fg-default">{{ aiHostingLabels[project.metrics.hosting] }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="hasMoneyData(project.metrics)" class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">成本与收益</h2>

        <dl class="mt-3 space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">每月成本</dt>
            <dd class="font-medium text-fg-default">{{ formatCny(project.metrics.monthlyCostCny) }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">每月收入</dt>
            <dd class="font-medium text-fg-default">{{ formatCny(project.metrics.monthlyRevenueCny) }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">总收入</dt>
            <dd class="font-medium text-fg-default">{{ formatCny(project.metrics.totalRevenueCny) }}</dd>
          </div>
          <div v-if="monthlyProfit(project.metrics) !== null" class="flex items-center justify-between">
            <dt class="text-fg-muted">每月净利</dt>
            <dd class="font-medium" :class="profitClass(profitState(project.metrics))">
              {{ formatCny(monthlyProfit(project.metrics)) }}
            </dd>
          </div>
          <div v-if="project.metrics.revenueModel" class="flex items-center justify-between">
            <dt class="text-fg-muted">商业模式</dt>
            <dd class="text-fg-default">{{ revenueModelLabels[project.metrics.revenueModel] }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">当前状态</dt>
            <dd :class="profitClass(profitState(project.metrics))">{{ profitLabel(profitState(project.metrics)) }}</dd>
          </div>
        </dl>

        <p v-if="project.metrics.costNote" class="mt-3 text-xs leading-5 text-fg-muted">
          <span class="text-fg-default">成本说明：</span>{{ project.metrics.costNote }}
        </p>
        <p v-if="project.metrics.revenueNote" class="mt-2 text-xs leading-5 text-fg-muted">
          <span class="text-fg-default">收益说明：</span>{{ project.metrics.revenueNote }}
        </p>

        <p class="mt-3 border-t border-border-muted pt-2 text-[11px] text-fg-subtle">
          成本与收益由作者自行填写，栈桥不做审计。
        </p>
      </section>

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
          <AppStat icon="heart" :value="likeCount" label="点赞" />
          <AppStat icon="star" :value="favoriteCount" label="收藏" />
        </div>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            :disabled="busyAction === 'like'"
            class="h-8 flex-1 rounded-md border text-sm disabled:opacity-60"
            :class="interaction?.liked
              ? 'border-accent bg-accent-subtle font-medium text-accent'
              : 'border-border-default hover:border-accent hover:text-accent'"
            @click="toggleAction('like')"
          >
            {{ interaction?.liked ? '已点赞' : '点赞' }}
          </button>
          <button
            type="button"
            :disabled="busyAction === 'favorite'"
            class="h-8 flex-1 rounded-md border text-sm disabled:opacity-60"
            :class="interaction?.favorited
              ? 'border-accent bg-accent-subtle font-medium text-accent'
              : 'border-border-default hover:border-accent hover:text-accent'"
            @click="toggleAction('favorite')"
          >
            {{ interaction?.favorited ? '已收藏' : '收藏' }}
          </button>
        </div>
        <p v-if="actionError" class="mt-2 text-xs text-danger">{{ actionError }}</p>
        <p v-if="!user" class="mt-2 text-xs text-fg-subtle">登录后可以点赞和收藏</p>
        <div class="mt-1">
          <ReportButton target-type="project" :target-id="project.id" />
        </div>
      </section>
    </aside>
  </div>
</template>
