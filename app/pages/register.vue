<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

useHead({ title: '注册 · 栈桥' })

const form = reactive({ email: '', code: '', username: '', nickname: '', password: '' })
const error = ref('')
const notice = ref('')
const pending = ref(false)
const sending = ref(false)
const codeSent = ref(false)
const countdown = ref(0)

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
  error.value = ''
  notice.value = ''

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
    error.value = '请先填写正确的邮箱'
    return
  }

  sending.value = true
  try {
    const res = await $fetch<{ delivered: boolean, devCode?: string, expiresInMinutes: number }>(
      '/api/auth/send-code',
      { method: 'POST', body: { email: form.email.trim() } },
    )

    codeSent.value = true
    startCountdown()

    if (res.devCode) {
      notice.value = `开发模式未走邮件，验证码是 ${res.devCode}（${res.expiresInMinutes} 分钟内有效）`
      form.code = res.devCode
    }
    else {
      notice.value = res.delivered
        ? `验证码已发送到 ${form.email}，10 分钟内有效`
        : '邮件发送失败，请稍后再试'
    }
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
  finally {
    sending.value = false
  }
}

async function submit() {
  error.value = ''
  notice.value = ''
  pending.value = true

  try {
    const res = await $fetch<{ user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: { ...form, email: form.email.trim() },
    })
    useAuthUser().value = res.user
    await navigateTo('/me?welcome=1')
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthCard title="加入栈桥" description="用邮箱注册，注册成功后即可发布项目。">
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
        {{ error }}
      </p>
      <p v-if="notice" class="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
        {{ notice }}
      </p>

      <FormField label="邮箱" hint="用于登录、接收验证码和找回密码">
        <div class="flex gap-2">
          <input
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
            class="h-8 flex-1 rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
          >
          <button
            type="button"
            :disabled="sending || countdown > 0"
            class="h-8 whitespace-nowrap rounded-md border border-border-default px-3 text-sm hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown} 秒后重发` : (sending ? '发送中…' : '获取验证码') }}
          </button>
        </div>
      </FormField>

      <FormField label="邮箱验证码" hint="邮件里的 6 位数字，10 分钟内有效">
        <input
          v-model="form.code"
          required
          inputmode="numeric"
          maxlength="6"
          placeholder="6 位数字"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 font-mono tracking-widest focus:border-accent focus:outline-none"
        >
      </FormField>

      <FormField label="用户名" hint="3-20 位小写字母、数字、下划线或连字符，会出现在你的主页地址里">
        <input
          v-model="form.username"
          required
          autocomplete="username"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <FormField label="昵称" hint="其他用户看到的名字，最多 16 个字">
        <input
          v-model="form.nickname"
          required
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <FormField label="密码" hint="至少 8 位">
        <input
          v-model="form.password"
          type="password"
          required
          autocomplete="new-password"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <button
        type="submit"
        :disabled="pending || !codeSent"
        class="h-8 w-full rounded-md border border-accent bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {{ pending ? '正在注册…' : '注册' }}
      </button>

      <p v-if="!codeSent" class="text-xs text-fg-subtle">
        先点「获取验证码」，收到邮件后填写验证码即可完成注册。
      </p>
    </form>

    <template #footer>
      已经有账号了？<NuxtLink to="/login" class="no-underline hover:underline">去登录</NuxtLink>
    </template>
  </AuthCard>
</template>
