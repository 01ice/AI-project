<script setup lang="ts">
definePageMeta({ layout: 'editor' })

useHead({ title: '写文章 · 栈桥' })

const user = useAuthUser()
</script>

<template>
  <PostEditor v-if="user" />

  <div v-else class="flex flex-1 items-center justify-center px-4 py-20">
    <div class="w-full max-w-[420px] card p-6 text-center">
      <p class="text-sm text-fg-muted">写文章需要先登录。</p>
      <div class="mt-4 flex justify-center gap-2">
        <NuxtLink
          to="/login?redirect=/blog/new"
          class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white no-underline"
        >
          去登录
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="inline-flex h-8 items-center card px-4 text-sm no-underline hover:border-accent hover:text-accent"
        >
          注册账号
        </NuxtLink>
      </div>
      <NuxtLink to="/blog" class="mt-4 inline-block text-xs text-fg-subtle no-underline hover:underline">
        先去读几篇文章 →
      </NuxtLink>
    </div>
  </div>
</template>
