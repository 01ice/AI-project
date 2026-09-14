<script setup lang="ts">
import type { MyCommentItem } from '~~/shared/types'

useHead({ title: '我的评论 · 栈桥' })

const user = useAuthUser()
const busyId = ref('')
const message = ref('')

const { data, refresh } = await useFetch<{ items: MyCommentItem[] }>('/api/me/comments', {
  immediate: !!user.value,
})

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me/comments' } })
  }
  else {
    await refresh()
  }
})

async function remove(id: string) {
  busyId.value = id
  message.value = ''
  try {
    await $fetch(`/api/comments/${id}`, { method: 'DELETE' })
    message.value = '评论已删除'
    await refresh()
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    busyId.value = ''
  }
}

function targetLink(item: MyCommentItem) {
  if (!item.targetSlug) return null
  return item.targetType === 'project' ? `/projects/${item.targetSlug}` : `/blog/${item.targetSlug}`
}
</script>

<template>
  <div class="w-full">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold text-fg-default">我的评论</h1>
      <NuxtLink to="/me" class="ml-auto text-sm text-fg-muted no-underline hover:text-accent hover:underline">
        返回个人中心
      </NuxtLink>
    </header>

    <p v-if="message" class="mb-3 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ message }}
    </p>

    <p v-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
      还没有发表过评论，<NuxtLink to="/projects" class="no-underline hover:underline">去看看项目</NuxtLink>。
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="item in data.items"
        :key="item.id"
        class="card p-4"
      >
        <div class="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <span
            v-if="item.status !== 'visible'"
            class="rounded-full border border-border-default px-2 py-0.5 text-fg-subtle"
          >已删除</span>
          <NuxtLink
            v-if="targetLink(item)"
            :to="targetLink(item)!"
            class="font-medium no-underline hover:underline"
          >{{ item.targetTitle ?? '（内容已删除）' }}</NuxtLink>
          <span v-else class="font-medium text-fg-subtle">{{ item.targetTitle ?? '（内容已删除）' }}</span>
          <span>{{ relativeTime(item.createdAt) }}</span>
        </div>

        <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-fg-default">{{ item.content }}</p>

        <div v-if="item.status === 'visible'" class="mt-2">
          <button
            type="button"
            :disabled="busyId === item.id"
            class="text-xs text-fg-muted hover:text-danger disabled:opacity-60"
            @click="remove(item.id)"
          >
            删除
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
