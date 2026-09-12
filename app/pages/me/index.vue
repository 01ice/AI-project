<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

useHead({ title: '个人中心 · 栈桥' })

const route = useRoute()
const user = useAuthUser()
const unread = useUnreadNotifications()

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

if (route.query.welcome === '1') {
  notice.value = '注册成功，邮箱已完成验证，现在可以发布项目了。'
}

onMounted(async () => {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { redirect: '/me' } })
  }
})

let timer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (timer) clearInterval(timer)
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

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  await navigateTo('/')
}

const { data: myProjects } = await useFetch<{ items: unknown[] }>('/api/me/projects', {
  immediate: !!user.value,
})
const { data: myPosts } = await useFetch<{ items: unknown[] }>('/api/me/posts', {
  immediate: !!user.value,
})
const { data: myFavorites } = await useFetch<{ items: unknown[] }>('/api/me/favorites', {
  immediate: !!user.value,
})

const stats = computed(() => [
  { label: '我的项目', value: myProjects.value?.items.length ?? 0, to: '/me/projects' },
  { label: '我的文章', value: myPosts.value?.items.length ?? 0, to: '/me/posts' },
  { label: '我的收藏', value: myFavorites.value?.items.length ?? 0, to: '/me/favorites' },
  { label: '未读通知', value: unread.value, to: '/me/notifications' },
])

const modules = computed(() => {
  const items = [
    { title: '发布项目', desc: '把你的作品放进项目库，公开模型与成本', to: '/projects/new' },
    { title: '写文章', desc: '记录做法、成本账与踩坑，可关联多个项目', to: '/blog/new' },
    { title: '我的项目', desc: '查看审核状态、编辑或删除已发布内容', to: '/me/projects' },
    { title: '我的文章', desc: '草稿、待审与已发布文章都在这里', to: '/me/posts' },
    { title: '我的收藏', desc: '收藏过的项目，随时回来查看', to: '/me/favorites' },
    { title: '我的评论', desc: '发表过的评论与所在内容', to: '/me/comments' },
    { title: '我的通知', desc: '审核结果与回复提醒', to: '/me/notifications' },
  ]

  if (user.value?.role === 'admin') {
    items.push({ title: '管理后台', desc: '审核项目、文章、标签与举报', to: '/admin' })
  }

  return items
})
</script>

<template>
  <div v-if="user" class="space-y-4">
    <p v-if="notice" class="card border-success/30 bg-success/5 px-4 py-3 text-xs text-success">
      {{ notice }}
    </p>

    <section class="card">
      <div class="card-body flex flex-wrap items-start gap-4">
        <AppAvatar :name="user.nickname" :username="user.username" :size="64" :image-url="user.avatarUrl" />

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-lg font-semibold text-fg-default">{{ user.nickname }}</h1>
            <span v-if="user.role === 'admin'" class="badge bg-accent-subtle text-accent">管理员</span>
            <span
              class="badge"
              :class="user.emailVerified ? 'bg-success/10 text-success' : 'bg-attention/10 text-attention'"
            >
              {{ user.emailVerified ? '邮箱已验证' : '邮箱未验证' }}
            </span>
          </div>
          <p class="mt-1 text-sm text-fg-muted">@{{ user.username }}</p>
          <p v-if="user.bio" class="mt-2 max-w-2xl text-sm leading-6 text-fg-default">{{ user.bio }}</p>
          <p class="mt-2 text-xs text-fg-subtle">
            用户名是唯一标识，不可修改；昵称、简介与头像可以随时调整
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-secondary btn-sm" @click="editing ? (editing = false) : openEditor()">
            {{ editing ? '取消编辑' : '编辑资料' }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="logout">退出登录</button>
        </div>
      </div>

      <div class="border-t border-border-muted px-5 py-4">
        <p v-if="profileMessage" class="mb-3 text-xs text-success">{{ profileMessage }}</p>

        <div v-if="editing" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="昵称" hint="展示给别人的名字，可以用中文，最多 16 个字">
            <input v-model="profileForm.nickname" maxlength="16" class="input">
          </FormField>

          <div>
            <p class="mb-1 text-sm font-medium text-fg-default">头像</p>
            <div class="w-28">
              <ImageUpload v-model="profileForm.avatarUrl" label="上传头像" aspect="aspect-square" />
            </div>
          </div>

          <FormField label="简介" hint="最多 200 字，会显示在你的公开主页上">
            <textarea
              v-model="profileForm.bio"
              rows="3"
              maxlength="200"
              placeholder="例如：前端工程师，喜欢写小工具"
              class="textarea"
            />
          </FormField>

          <div class="flex items-end">
            <button type="button" :disabled="savingProfile" class="btn btn-primary" @click="saveProfile">
              {{ savingProfile ? '保存中…' : '保存资料' }}
            </button>
          </div>
        </div>

        <div v-if="!editing && !user.emailVerified" class="flex flex-wrap items-center gap-3">
          <p class="text-xs text-fg-muted">
            邮箱验证后才能发布项目。点「获取验证码」，把邮件里的 6 位数字填进来即可。
          </p>
          <button
            type="button"
            :disabled="sending || countdown > 0"
            class="btn btn-secondary btn-sm"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown} 秒后重发` : (sending ? '发送中…' : '获取验证码') }}
          </button>
          <input v-model="code" inputmode="numeric" maxlength="6" placeholder="6 位验证码" class="input h-8 w-32 font-mono tracking-widest">
          <button
            type="button"
            :disabled="verifying || code.length !== 6"
            class="btn btn-primary btn-sm"
            @click="verifyCode"
          >
            {{ verifying ? '验证中…' : '完成验证' }}
          </button>
        </div>
        <p v-if="message" class="mt-2 text-xs text-fg-muted">{{ message }}</p>

        <p v-if="!editing && user.emailVerified" class="text-xs text-fg-muted">
          邮箱 {{ user.email }} 已验证，可以发布项目和文章。
        </p>
      </div>
    </section>

    <section>
      <h2 class="section-title mb-3">数据概览</h2>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NuxtLink
          v-for="item in stats"
          :key="item.label"
          :to="item.to"
          class="stat-card no-underline hover:shadow-card-hover"
        >
          <p class="stat-label">{{ item.label }}</p>
          <p class="stat-value">{{ item.value }}</p>
        </NuxtLink>
      </div>
    </section>

    <section>
      <h2 class="section-title mb-3">功能模块</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="item in modules"
          :key="item.to"
          :to="item.to"
          class="card card-hover block p-5 no-underline"
        >
          <p class="text-[15px] font-semibold text-fg-default">{{ item.title }}</p>
          <p class="mt-1 text-sm leading-6 text-fg-muted">{{ item.desc }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
