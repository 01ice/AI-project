<script setup lang="ts">
useHead({ title: '重置密码 · 栈桥' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirm = ref('')
const error = ref('')
const done = ref(false)
const pending = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== confirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  pending.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    done.value = true
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
  <AuthCard title="设置新密码" description="密码修改后，所有设备都需要重新登录。">
    <div v-if="done" class="space-y-3 text-sm text-fg-muted">
      <p>密码已经更新。</p>
      <NuxtLink
        to="/login"
        class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white no-underline"
      >
        去登录
      </NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
        {{ error }}
      </p>

      <p v-if="!token" class="rounded-md border border-attention/40 bg-attention/5 px-3 py-2 text-xs text-attention">
        重置链接不完整，请从邮件里的链接进入。
      </p>

      <FormField label="新密码" hint="至少 8 位">
        <input
          v-model="password"
          type="password"
          required
          autocomplete="new-password"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <FormField label="再次输入新密码">
        <input
          v-model="confirm"
          type="password"
          required
          autocomplete="new-password"
          class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
        >
      </FormField>

      <button
        type="submit"
        :disabled="pending || !token"
        class="h-8 w-full rounded-md border border-accent bg-accent text-sm font-medium text-white disabled:opacity-60"
      >
        {{ pending ? '提交中…' : '设置新密码' }}
      </button>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="no-underline hover:underline">返回登录</NuxtLink>
    </template>
  </AuthCard>
</template>
