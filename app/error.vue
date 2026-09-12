<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="mx-auto flex w-full max-w-[1280px] flex-1 items-center justify-center px-4">
      <div class="py-20 text-center">
        <p class="text-4xl font-semibold text-fg-subtle">{{ props.error.statusCode }}</p>
        <h1 class="mt-3 text-lg font-semibold text-fg-default">
          {{ props.error.statusMessage || '页面出错了' }}
        </h1>
        <button
          type="button"
          class="mt-5 h-8 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white"
          @click="clearError({ redirect: '/' })"
        >
          回到首页
        </button>
      </div>
    </main>
    <AppFooter />
  </div>
</template>
