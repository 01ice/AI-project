<script setup lang="ts">
useHead({ title: '写文章 · 栈桥' })

const user = useAuthUser()
</script>

<template>
  <div class="mx-auto max-w-[900px]">
    <header class="mb-5">
      <h1 class="text-xl font-semibold text-fg-default">写文章</h1>
      <p class="mt-2 text-sm text-fg-muted">
        内容会自动保存为草稿。写下你的做法、成本账或者踩过的坑——
        关联到项目之后，文章会出现在项目详情页的「相关文章」里。
      </p>
    </header>

    <div v-if="!user" class="rounded-md border border-border-default bg-canvas p-6 text-center">
      <p class="text-sm text-fg-muted">写文章需要先登录。</p>
      <div class="mt-3 flex justify-center gap-2">
        <NuxtLink
          to="/login?redirect=/blog/new"
          class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white no-underline"
        >
          去登录
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="inline-flex h-8 items-center rounded-md border border-border-default px-4 text-sm no-underline hover:border-accent hover:text-accent"
        >
          注册账号
        </NuxtLink>
      </div>
    </div>

    <PostEditor v-else />
  </div>
</template>
