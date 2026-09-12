<script setup lang="ts">
import type { FavoriteItem } from '~~/shared/types'

useHead({ title: '我的收藏 · 栈桥' })

const user = useAuthUser()
const busyId = ref('')
const message = ref('')

const { data, refresh } = await useFetch<{ items: FavoriteItem[] }>('/api/me/favorites', {
  immediate: !!user.value,
})

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me/favorites' } })
  }
  else {
    await refresh()
  }
})

async function remove(projectId: string) {
  busyId.value = projectId
  message.value = ''
  try {
    await $fetch('/api/interactions', {
      method: 'POST',
      body: { action: 'favorite', targetId: projectId },
    })
    message.value = '已取消收藏'
    await refresh()
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    busyId.value = ''
  }
}
</script>

<template>
  <div class="w-full">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold text-fg-default">我的收藏</h1>
      <NuxtLink to="/me" class="ml-auto text-sm text-fg-muted no-underline hover:text-accent hover:underline">
        返回个人中心
      </NuxtLink>
    </header>

    <p v-if="message" class="mb-3 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ message }}
    </p>

    <p v-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
      还没有收藏任何项目，<NuxtLink to="/projects" class="no-underline hover:underline">去看看项目</NuxtLink>。
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="item in data.items"
        :key="item.projectId"
        class="flex gap-3 card p-3"
      >
        <NuxtLink :to="`/projects/${item.slug}`" class="shrink-0">
          <img
            :src="item.coverUrl"
            :alt="item.title"
            width="112"
            height="72"
            class="h-[72px] w-28 rounded-md border border-border-muted object-cover"
          >
        </NuxtLink>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink :to="`/projects/${item.slug}`" class="text-base font-semibold text-accent no-underline hover:underline">
              {{ item.title }}
            </NuxtLink>
            <span v-if="item.categoryName" class="rounded-full border border-border-default bg-canvas-subtle px-2.5 py-0.5 text-xs text-fg-muted">
              {{ item.categoryName }}
            </span>
          </div>
          <p class="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-muted">{{ item.summary }}</p>
          <p class="mt-2 text-xs text-fg-subtle">
            {{ item.authorName }} · 收藏于 {{ relativeTime(item.createdAt) }}
          </p>
        </div>

        <button
          type="button"
          :disabled="busyId === item.projectId"
          class="shrink-0 self-start text-sm text-fg-muted hover:text-danger disabled:opacity-60"
          @click="remove(item.projectId)"
        >
          取消收藏
        </button>
      </li>
    </ul>
  </div>
</template>
