<script setup lang="ts">
import type { NotificationListResponse } from '~~/shared/types'

useHead({ title: '我的通知 · 栈桥' })

const user = useAuthUser()
const unread = useUnreadNotifications()
const busy = ref(false)
const message = ref('')
const emailNotice = ref(true)

const { data, refresh } = await useFetch<NotificationListResponse>('/api/me/notifications', {
  immediate: !!user.value,
})

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me/notifications' } })
    return
  }
  await refresh()
  unread.value = data.value?.unread ?? 0
})

async function markAllRead() {
  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/me/notifications/read', { method: 'POST', body: {} })
    message.value = '已全部标记为已读'
    await refresh()
    unread.value = 0
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    busy.value = false
  }
}

async function markRead(id: string) {
  try {
    await $fetch('/api/me/notifications/read', { method: 'POST', body: { id } })
    await refresh()
    unread.value = data.value?.unread ?? 0
  }
  catch {
    // 单条已读失败可以忽略
  }
}

async function toggleEmail() {
  emailNotice.value = !emailNotice.value
  try {
    await $fetch('/api/me/notification-settings', {
      method: 'POST',
      body: { notifyByEmail: emailNotice.value },
    })
    message.value = emailNotice.value ? '已开启邮件提醒' : '已关闭邮件提醒'
  }
  catch (err) {
    emailNotice.value = !emailNotice.value
    message.value = authErrorMessage(err)
  }
}
</script>

<template>
  <div class="mx-auto max-w-[800px]">
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-semibold text-fg-default">我的通知</h1>
      <span v-if="unread" class="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
        {{ unread }} 条未读
      </span>
      <div class="ml-auto flex items-center gap-3">
        <button
          type="button"
          :disabled="busy || !data?.items.length"
          class="text-sm text-fg-muted hover:text-accent disabled:opacity-50"
          @click="markAllRead"
        >
          全部标为已读
        </button>
        <NuxtLink to="/me" class="text-sm text-fg-muted no-underline hover:text-accent hover:underline">
          返回个人中心
        </NuxtLink>
      </div>
    </header>

    <p v-if="message" class="mb-3 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ message }}
    </p>

    <div class="mb-4 flex items-center gap-3 rounded-md border border-border-default bg-canvas px-4 py-3">
      <div>
        <p class="text-sm text-fg-default">邮件提醒</p>
        <p class="mt-0.5 text-xs text-fg-subtle">
          开启后，审核结果和有人回复你时会同时发一封邮件
        </p>
      </div>
      <button
        type="button"
        class="ml-auto h-7 w-12 rounded-full border transition-colors"
        :class="emailNotice ? 'border-accent bg-accent' : 'border-border-default bg-canvas-subtle'"
        @click="toggleEmail"
      >
        <span
          class="block h-5 w-5 rounded-full bg-white transition-transform"
          :class="emailNotice ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <p v-if="!data?.items.length" class="rounded-md border border-dashed border-border-default py-16 text-center text-sm text-fg-muted">
      还没有通知。当有人评论你的内容、或你的投稿有审核结果时，会出现在这里。
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="item in data.items"
        :key="item.id"
        class="rounded-md border bg-canvas p-4"
        :class="item.read ? 'border-border-default' : 'border-accent/40'"
      >
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span
            class="rounded-full px-2 py-0.5"
            :class="item.read ? 'bg-canvas-subtle text-fg-muted' : 'bg-accent-subtle text-accent'"
          >{{ notificationTypeLabels[item.type] ?? item.type }}</span>
          <span class="text-fg-subtle">{{ relativeTime(item.createdAt) }}</span>
          <span v-if="!item.read" class="text-danger">未读</span>
        </div>

        <p class="mt-2 text-sm font-medium text-fg-default">{{ item.title }}</p>
        <p v-if="item.body" class="mt-1 whitespace-pre-wrap text-xs leading-5 text-fg-muted">{{ item.body }}</p>

        <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <NuxtLink
            v-if="item.link"
            :to="item.link"
            class="text-accent no-underline hover:underline"
            @click="markRead(item.id)"
          >
            查看 →
          </NuxtLink>
          <button
            v-if="!item.read"
            type="button"
            class="text-fg-subtle hover:text-accent"
            @click="markRead(item.id)"
          >
            标为已读
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
