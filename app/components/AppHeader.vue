<script setup lang="ts">
const route = useRoute()
const keyword = ref(typeof route.query.q === 'string' ? route.query.q : '')
const user = useAuthUser()
const menuOpen = ref(false)

const navItems = [
  { label: '项目', to: '/projects' },
  { label: 'AI 项目', to: '/projects?ai=1' },
  { label: '排行榜', to: '/ranking' },
  { label: '博客', to: '/blog' },
  { label: '关于', to: '/about' },
]

function submitSearch() {
  const value = keyword.value.trim()
  return navigateTo({ path: '/projects', query: value ? { q: value } : {} })
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  menuOpen.value = false
  await navigateTo('/')
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

      <div v-if="!user" class="flex items-center gap-2">
        <NuxtLink
          to="/login"
          class="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-fg-default no-underline hover:bg-border-muted/40"
        >
          登录
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white no-underline hover:bg-accent/90"
        >
          注册
        </NuxtLink>
      </div>

      <div v-else class="relative">
        <button
          type="button"
          class="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-fg-default hover:bg-border-muted/40"
          @click="menuOpen = !menuOpen"
        >
          <AppAvatar :name="user.nickname" :username="user.username" :size="20" :image-url="user.avatarUrl" />
          <span class="hidden max-w-24 truncate sm:inline">{{ user.nickname }}</span>
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border-default bg-canvas py-1 shadow-lg"
          @click="menuOpen = false"
        >
          <NuxtLink to="/me" class="block px-3 py-1.5 text-sm text-fg-default no-underline hover:bg-canvas-subtle">
            个人中心
          </NuxtLink>
          <NuxtLink
            v-if="user.role === 'admin'"
            to="/admin"
            class="block px-3 py-1.5 text-sm text-fg-default no-underline hover:bg-canvas-subtle"
          >
            管理后台
          </NuxtLink>
          <button
            type="button"
            class="block w-full px-3 py-1.5 text-left text-sm text-fg-default hover:bg-canvas-subtle"
            @click="logout"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
