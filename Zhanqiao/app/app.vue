<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

const { data } = await useFetch<{ user: SessionUser | null }>('/api/auth/me', { key: 'auth-me' })
useAuthUser().value = data.value?.user ?? null

if (data.value?.user) {
  const { data: unread } = await useFetch<{ unread: number }>('/api/me/notifications', {
    key: 'notif-unread',
    query: { limit: 1 },
  })
  useUnreadNotifications().value = unread.value?.unread ?? 0
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
