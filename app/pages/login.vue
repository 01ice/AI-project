<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

useHead({ title: '登录 · 栈桥' })

const route = useRoute()
const form = reactive({ email: '', password: '' })
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: form,
    })
    useAuthUser().value = res.user
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await navigateTo(redirect)
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
  <AuthCard title="登录栈桥">
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
        {{ error }}
      </p>

      <FormField label="邮箱">
        <input
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <FormField label="密码">
        <input
          v-model="form.password"
          type="password"
          required
          autocomplete="current-password"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <button
        type="submit"
        :disabled="pending"
        class="h-8 w-full rounded-md border border-accent bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {{ pending ? '正在登录…' : '登录' }}
      </button>
    </form>

    <template #footer>
      <NuxtLink to="/forgot-password" class="no-underline hover:underline">忘记密码？</NuxtLink>
      <span class="mx-2 text-fg-subtle">·</span>
      还没有账号？<NuxtLink to="/register" class="no-underline hover:underline">注册</NuxtLink>
    </template>
  </AuthCard>
</template>
