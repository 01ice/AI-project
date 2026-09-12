<script setup lang="ts">
useHead({ title: '找回密码 · 栈桥' })

const email = ref('')
const sent = ref(false)
const devUrl = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch<{ ok: boolean, resetUrl?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    devUrl.value = res.resetUrl ?? ''
    sent.value = true
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
  <AuthCard title="找回密码" description="输入注册时使用的邮箱，我们会发送一封重置邮件。">
    <div v-if="sent" class="space-y-3 text-sm text-fg-muted">
      <p>如果该邮箱已经注册，重置链接已经发送，请查收邮件（30 分钟内有效）。</p>
      <p v-if="devUrl" class="break-all rounded-md border border-border-default bg-canvas-subtle px-3 py-2 text-xs">
        开发模式：<NuxtLink :to="devUrl.replace(/^https?:\/\/[^/]+/, '')" class="no-underline hover:underline">{{ devUrl }}</NuxtLink>
      </p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
        {{ error }}
      </p>

      <FormField label="邮箱">
        <input
          v-model="email"
          type="email"
          required
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <button
        type="submit"
        :disabled="pending"
        class="h-8 w-full rounded-md border border-accent bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {{ pending ? '发送中…' : '发送重置邮件' }}
      </button>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="no-underline hover:underline">返回登录</NuxtLink>
    </template>
  </AuthCard>
</template>
