<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

useHead({ title: '个人中心 · 栈桥' })

const route = useRoute()
const user = useAuthUser()
const unreadCount = useUnreadNotifications()
const notice = ref('')
const message = ref('')
const code = ref('')
const sending = ref(false)
const verifying = ref(false)
const countdown = ref(0)
const editing = ref(false)
const savingProfile = ref(false)
const profileMessage = ref('')

const profileForm = reactive({
  nickname: user.value?.nickname ?? '',
  bio: user.value?.bio ?? '',
  avatarUrl: user.value?.avatarUrl ?? '',
})

function openEditor() {
  profileForm.nickname = user.value?.nickname ?? ''
  profileForm.bio = user.value?.bio ?? ''
  profileForm.avatarUrl = user.value?.avatarUrl ?? ''
  profileMessage.value = ''
  editing.value = true
}

async function saveProfile() {
  savingProfile.value = true
  profileMessage.value = ''
  try {
    const res = await $fetch<{ user: SessionUser }>('/api/me/profile', {
      method: 'POST',
      body: profileForm,
    })
    user.value = res.user
    editing.value = false
    profileMessage.value = '资料已更新'
  }
  catch (err) {
    profileMessage.value = authErrorMessage(err)
  }
  finally {
    savingProfile.value = false
  }
}

let timer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

if (route.query.welcome === '1') {
  notice.value = '注册成功，邮箱已完成验证，现在可以发布项目了。'
}

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me' } })
  }
})

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function sendCode() {
  message.value = ''
  sending.value = true
  try {
    const res = await $fetch<{ delivered: boolean, devCode?: string }>('/api/auth/resend-verification', {
      method: 'POST',
    })
    startCountdown()
    if (res.devCode) {
      code.value = res.devCode
      message.value = `开发模式未走邮件，验证码是 ${res.devCode}`
    }
    else {
      message.value = res.delivered ? '验证码已发送，请查收邮件（10 分钟内有效）' : '发送失败，请稍后再试'
    }
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    sending.value = false
  }
}

async function verifyCode() {
  message.value = ''
  verifying.value = true
  try {
    const res = await $fetch<{ user: SessionUser }>('/api/auth/verify-email-code', {
      method: 'POST',
      body: { code: code.value },
    })
    user.value = res.user
    message.value = '邮箱验证完成，现在可以发布项目了。'
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    verifying.value = false
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

      <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-border-muted pt-4">
        <button
          type="button"
          class="h-8 rounded-md border border-border-default px-3 text-sm hover:border-accent hover:text-accent"
          @click="editing ? (editing = false) : openEditor()"
        >
          {{ editing ? '取消编辑' : '编辑资料' }}
        </button>
        <span class="text-xs text-fg-subtle">用户名 @{{ user.username }} 是唯一标识，不可修改</span>
        <span v-if="profileMessage" class="text-xs text-success">{{ profileMessage }}</span>
      </div>

      <div v-if="editing" class="mt-3 space-y-3 rounded-md border border-border-default bg-canvas-subtle p-4">
        <FormField label="昵称" hint="展示给别人的名字，可以用中文，最多 16 个字">
          <input
            v-model="profileForm.nickname"
            maxlength="16"
            class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>

        <FormField label="简介" hint="最多 200 字，会显示在你的公开主页上">
          <textarea
            v-model="profileForm.bio"
            rows="3"
            maxlength="200"
            placeholder="例如：前端工程师，喜欢写小工具"
            class="w-full rounded-md border border-border-default bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </FormField>

        <div>
          <p class="mb-1 text-sm font-medium text-fg-default">头像</p>
          <div class="w-32">
            <ImageUpload v-model="profileForm.avatarUrl" label="上传头像" aspect="aspect-square" />
          </div>
        </div>

        <button
          type="button"
          :disabled="savingProfile"
          class="h-8 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white disabled:opacity-60"
          @click="saveProfile"
        >
          {{ savingProfile ? '保存中…' : '保存资料' }}
        </button>
      </div>

      <div v-if="!user.emailVerified" class="mt-4 rounded-md border border-border-default bg-canvas-subtle p-3">
        <p class="text-xs text-fg-muted">
          邮箱验证后才能发布项目。点「获取验证码」，把邮件里的 6 位数字填进来即可。
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            :disabled="sending || countdown > 0"
            class="h-8 whitespace-nowrap rounded-md border border-border-default px-3 text-sm hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown} 秒后重发` : (sending ? '发送中…' : '获取验证码') }}
          </button>
          <input
            v-model="code"
            inputmode="numeric"
            maxlength="6"
            placeholder="6 位验证码"
            class="h-8 w-32 rounded-md border border-border-default bg-canvas px-3 font-mono tracking-widest text-sm focus:border-accent focus:outline-none"
          >
          <button
            type="button"
            :disabled="verifying || code.length !== 6"
            class="h-8 rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white disabled:opacity-50"
            @click="verifyCode"
          >
            {{ verifying ? '验证中…' : '完成验证' }}
          </button>
        </div>
        <p v-if="message" class="mt-2 text-xs text-fg-muted">{{ message }}</p>
      </div>
    </section>

    <section class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        to="/me/notifications"
        class="rounded-md border border-border-default bg-canvas p-4 no-underline hover:border-accent"
      >
        <h2 class="text-sm font-semibold text-fg-default">
          我的通知 →
          <span v-if="unreadCount" class="ml-1 text-xs text-danger">{{ unreadCount }} 条未读</span>
        </h2>
        <p class="mt-1 text-xs text-fg-muted">审核结果与回复提醒</p>
      </NuxtLink>
      <NuxtLink
        to="/me/projects"
        class="rounded-md border border-border-default bg-canvas p-4 no-underline hover:border-accent"
      >
        <h2 class="text-sm font-semibold text-fg-default">我的项目 →</h2>
        <p class="mt-1 text-xs text-fg-muted">查看与编辑已发布、待审核和草稿</p>
      </NuxtLink>
      <NuxtLink
        to="/me/posts"
        class="rounded-md border border-border-default bg-canvas p-4 no-underline hover:border-accent"
      >
        <h2 class="text-sm font-semibold text-fg-default">我的文章 →</h2>
        <p class="mt-1 text-xs text-fg-muted">写文章、看审核状态</p>
      </NuxtLink>
      <NuxtLink
        to="/me/favorites"
        class="rounded-md border border-border-default bg-canvas p-4 no-underline hover:border-accent"
      >
        <h2 class="text-sm font-semibold text-fg-default">我的收藏 →</h2>
        <p class="mt-1 text-xs text-fg-muted">收藏过的项目</p>
      </NuxtLink>
      <NuxtLink
        to="/me/comments"
        class="rounded-md border border-border-default bg-canvas p-4 no-underline hover:border-accent"
      >
        <h2 class="text-sm font-semibold text-fg-default">我的评论 →</h2>
        <p class="mt-1 text-xs text-fg-muted">发表过的评论</p>
      </NuxtLink>
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
