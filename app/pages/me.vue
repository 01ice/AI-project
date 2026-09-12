<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

useHead({ title: '个人中心 · 栈桥' })

const route = useRoute()
const user = useAuthUser()
const notice = ref('')
const mailSent = ref('')

// 直接访问 /me 时若尚未登录，交给服务端渲染后再跳转
onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me' } })
  }
})

if (route.query.welcome === '1') {
  notice.value = '注册成功。请先到邮箱完成验证，验证后即可发布项目。'
}

async function resend() {
  mailSent.value = ''
  try {
    const res = await $fetch<{ mailSent: boolean, verifyUrl?: string }>('/api/auth/resend-verification', {
      method: 'POST',
    })
    mailSent.value = res.verifyUrl
      ? `开发模式未配置 SMTP，验证链接：${res.verifyUrl}`
      : (res.mailSent ? '验证邮件已重新发送，请查收。' : '邮件发送失败，请稍后再试。')
  }
  catch (err) {
    mailSent.value = authErrorMessage(err)
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  await navigateTo('/')
}
</script>

<template>
  <div v-if="user" class="mx-auto max-w-[720px]">
    <p v-if="notice" class="mb-4 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ notice }}
    </p>

    <section class="rounded-md border border-border-default bg-canvas p-5">
      <div class="flex items-center gap-3">
        <AppAvatar :name="user.nickname" :username="user.username" :size="48" :image-url="user.avatarUrl" />
        <div class="min-w-0">
          <h1 class="text-lg font-semibold text-fg-default">{{ user.nickname }}</h1>
          <p class="text-sm text-fg-muted">@{{ user.username }}</p>
        </div>
        <span
          v-if="user.role === 'admin'"
          class="ml-auto rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent"
        >管理员</span>
      </div>

      <dl class="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div class="flex items-center gap-2">
          <dt class="text-fg-muted">邮箱</dt>
          <dd class="text-fg-default">{{ user.email }}</dd>
        </div>
        <div class="flex items-center gap-2">
          <dt class="text-fg-muted">邮箱状态</dt>
          <dd :class="user.emailVerified ? 'text-success' : 'text-attention'">
            {{ user.emailVerified ? '已验证' : '未验证' }}
          </dd>
        </div>
      </dl>

      <div v-if="!user.emailVerified" class="mt-4 rounded-md border border-border-default bg-canvas-subtle px-3 py-2">
        <p class="text-xs text-fg-muted">
          邮箱验证后才能发布项目。
          <button type="button" class="text-accent hover:underline" @click="resend">重新发送验证邮件</button>
        </p>
        <p v-if="mailSent" class="mt-2 break-all text-xs text-fg-muted">{{ mailSent }}</p>
      </div>
    </section>

    <section class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">我的项目</h2>
        <p class="mt-1 text-xs text-fg-muted">发布功能将在 D4 上线</p>
      </div>
      <div class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">我的收藏</h2>
        <p class="mt-1 text-xs text-fg-muted">收藏功能将在 D6 上线</p>
      </div>
      <div class="rounded-md border border-border-default bg-canvas p-4">
        <h2 class="text-sm font-semibold text-fg-default">我的评论</h2>
        <p class="mt-1 text-xs text-fg-muted">评论功能将在 D6 上线</p>
      </div>
    </section>

    <div class="mt-5">
      <button
        type="button"
        class="h-8 rounded-md border border-border-default px-3 text-sm hover:border-danger hover:text-danger"
        @click="logout"
      >
        退出登录
      </button>
    </div>
  </div>
</template>
