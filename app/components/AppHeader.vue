<script setup lang="ts">
const route = useRoute()
const keyword = ref(typeof route.query.q === 'string' ? route.query.q : '')
const user = useAuthUser()
const unread = useUnreadNotifications()
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const menuStyle = ref<{ top: string, right: string }>({ top: '52px', right: '16px' })
const mobileNavOpen = ref(false)

const navItems = [
  { label: '项目', to: '/projects' },
  { label: 'AI 项目', to: '/projects?ai=1' },
  { label: '排行榜', to: '/ranking' },
  { label: '博客', to: '/blog' },
  { label: '关于', to: '/about' },
]

function submitSearch() {
  const value = keyword.value.trim()
  return navigateTo({ path: '/search', query: value ? { q: value } : {} })
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  menuOpen.value = false
  await navigateTo('/')
}

// 点击菜单外部或按 Esc 关闭；路由变化也关闭
function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

/** 菜单贴着头像按钮定位：位置按按钮的实际位置算，窗口再窄也不会跑偏或被页头裁切 */
function toggleMenu() {
  if (menuOpen.value) {
    menuOpen.value = false
    return
  }

  const rect = menuButtonRef.value?.getBoundingClientRect()
  if (rect) {
    menuStyle.value = {
      top: `${Math.round(rect.bottom + 8)}px`,
      right: `${Math.max(8, Math.round(window.innerWidth - rect.right))}px`,
    }
  }
  menuOpen.value = true
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

watch(() => route.fullPath, () => {
  menuOpen.value = false
  mobileNavOpen.value = false
})

onMounted(() => {
  window.addEventListener('resize', () => { menuOpen.value = false })
})
</script>

<template>
  <header class="border-b border-border-default bg-canvas-subtle">
    <div class="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4">
      <NuxtLink to="/" class="flex items-center gap-2 no-underline">
        <img src="/logo-mark.svg" alt="栈桥" width="28" height="28" class="h-7 w-7 rounded-md">
        <span class="text-base font-semibold text-fg-default">栈桥</span>
      </NuxtLink>

      <button
        type="button"
        class="rounded-md p-1.5 text-fg-default hover:bg-border-muted/40 sm:hidden"
        aria-label="打开菜单"
        @click="mobileNavOpen = !mobileNavOpen"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M1.75 3.5h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Zm0 4h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Zm0 4h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z" />
        </svg>
      </button>

      <nav class="hidden items-center gap-1 sm:flex">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium text-fg-default no-underline transition-colors hover:bg-border-muted/40"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <form class="ml-auto hidden w-44 sm:block sm:w-64" @submit.prevent="submitSearch">
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

      <div v-else class="flex items-center gap-2">
        <NuxtLink
          to="/me/notifications"
          class="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted no-underline hover:bg-border-muted/40 hover:text-fg-default"
          title="我的通知"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2Zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 2.1-1 3h12c-.5-.9-1-1.902-1-3a5.002 5.002 0 0 0-4.005-4.901Z" />
          </svg>
          <span
            v-if="unread"
            class="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-danger px-1 text-center text-[10px] font-medium leading-4 text-white"
          >{{ unread > 99 ? '99+' : unread }}</span>
        </NuxtLink>

        <NuxtLink
          to="/blog/new"
          class="mr-1 hidden h-8 items-center rounded-md border border-border-default px-3 text-sm font-medium text-fg-default no-underline hover:border-accent hover:text-accent sm:inline-flex"
        >
          写文章
        </NuxtLink>
        <NuxtLink
          to="/projects/new"
          class="mr-1 hidden h-8 items-center rounded-md border border-border-default px-3 text-sm font-medium text-fg-default no-underline hover:border-accent hover:text-accent sm:inline-flex"
        >
          发布项目
        </NuxtLink>
        <div ref="menuRef" class="relative">
          <button
            ref="menuButtonRef"
            type="button"
            class="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-fg-default hover:bg-border-muted/40"
            :class="menuOpen ? 'bg-border-muted/40' : ''"
            @click="toggleMenu"
          >
            <AppAvatar :name="user.nickname" :username="user.username" :size="20" :image-url="user.avatarUrl" />
            <span class="hidden max-w-24 truncate sm:inline">{{ user.nickname }}</span>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" class="text-fg-subtle" aria-hidden="true">
              <path d="M4.427 6.427a.75.75 0 0 1 1.06 0L8 8.94l2.513-2.513a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.427 7.487a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>

          <!-- 用 fixed 定位避开页头的层叠与裁切，右侧对齐头像按钮 -->
          <div
            v-if="menuOpen"
            class="fixed z-50 w-48 overflow-hidden rounded-md border border-border-default bg-canvas py-1 shadow-lg"
            :style="{ top: menuStyle.top, right: menuStyle.right }"
          >
            <div class="border-b border-border-muted px-3 py-2">
              <p class="truncate text-sm font-medium text-fg-default">{{ user.nickname }}</p>
              <p class="truncate text-xs text-fg-subtle">{{ user.email }}</p>
            </div>
            <NuxtLink to="/me" class="block px-3 py-2 text-sm text-fg-default no-underline hover:bg-canvas-subtle">
              个人中心
            </NuxtLink>
            <NuxtLink to="/me/notifications" class="block px-3 py-2 text-sm text-fg-default no-underline hover:bg-canvas-subtle">
              我的通知
              <span v-if="unread" class="ml-1 text-xs text-danger">{{ unread }}</span>
            </NuxtLink>
            <NuxtLink
              v-if="user.role === 'admin'"
              to="/admin"
              class="block px-3 py-2 text-sm text-fg-default no-underline hover:bg-canvas-subtle"
            >
              管理后台
            </NuxtLink>
            <button
              type="button"
              class="mt-1 block w-full border-t border-border-muted px-3 py-2 text-left text-sm text-fg-default hover:bg-canvas-subtle"
              @click="logout"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端导航面板 -->
    <div v-if="mobileNavOpen" class="border-t border-border-default bg-canvas px-4 py-3 sm:hidden">
      <form class="mb-3" @submit.prevent="submitSearch">
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索项目、文章…"
          class="h-9 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </form>
      <nav class="grid grid-cols-2 gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-2 text-sm text-fg-default no-underline hover:bg-canvas-subtle"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div v-if="user" class="mt-3 flex flex-wrap gap-2 border-t border-border-muted pt-3">
        <NuxtLink
          to="/projects/new"
          class="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-sm no-underline"
        >
          发布项目
        </NuxtLink>
        <NuxtLink
          to="/blog/new"
          class="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-sm no-underline"
        >
          写文章
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
