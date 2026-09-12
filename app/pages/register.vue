<script setup lang="ts">
import type { SessionUser } from '~~/shared/types'

useHead({ title: '注册 · 栈桥' })

const form = reactive({ email: '', username: '', nickname: '', password: '' })
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch<{ user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: form,
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
  <AuthCard title="加入栈桥" description="注册后可以发布项目、评论互动，邮箱验证后即可投稿。">
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
        {{ error }}
      </p>

      <FormField label="邮箱" hint="用于登录、验证身份和找回密码">
        <input
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <FormField label="用户名" hint="3-20 位小写字母、数字、下划线或连字符，将出现在你的主页地址里">
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
        :disabled="pending"
        class="h-8 w-full rounded-md border border-accent bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {{ pending ? '正在注册…' : '注册' }}
      </button>
    </form>

    <template #footer>
      已经有账号了？<NuxtLink to="/login" class="no-underline hover:underline">去登录</NuxtLink>
    </template>
  </AuthCard>
</template>
