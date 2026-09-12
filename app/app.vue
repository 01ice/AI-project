<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

const { data } = await useFetch<{ user: SessionUser | null }>('/api/auth/me', { key: 'auth-me' })
useAuthUser().value = data.value?.user ?? null
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
