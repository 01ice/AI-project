<script setup lang="ts">
const route = useRoute()
const keyword = ref(typeof route.query.q === 'string' ? route.query.q : '')

const navItems = [
  { label: '项目', to: '/projects' },
  { label: 'AI 项目', to: '/projects?ai=1' },
  { label: '博客', to: '/blog' },
  { label: '关于', to: '/about' },
]

function submitSearch() {
  const value = keyword.value.trim()
  return navigateTo({ path: '/projects', query: value ? { q: value } : {} })
}
</script>

<template>
  <header class="border-b border-border-default bg-canvas-subtle">
    <div class="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4">
      <NuxtLink to="/" class="flex items-center gap-2 no-underline">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">栈</span>
        <span class="text-base font-semibold text-fg-default">栈桥</span>
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium text-fg-default no-underline transition-colors hover:bg-border-muted/40"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <form class="ml-auto w-44 sm:w-64" @submit.prevent="submitSearch">
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索项目…"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm text-fg-default placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        >
      </form>

      <div class="flex items-center gap-2">
        <button
          type="button"
          disabled
          title="登录功能将在 D2 上线"
          class="h-8 cursor-not-allowed rounded-md px-3 text-sm font-medium text-fg-default opacity-50"
        >
          登录
        </button>
        <button
          type="button"
          disabled
          title="注册功能将在 D2 上线"
          class="h-8 cursor-not-allowed rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white opacity-50"
        >
          注册
        </button>
      </div>
    </div>
  </header>
</template>
