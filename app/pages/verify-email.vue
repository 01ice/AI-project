<script setup lang="ts">
useHead({ title: '验证邮箱 · 栈桥' })

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''

const status = ref<'pending' | 'done' | 'failed'>('pending')
const message = ref('')
const user = useAuthUser()

onMounted(async () => {
  if (!token) {
    status.value = 'failed'
    message.value = '验证链接不完整，请从邮件里的链接进入。'
    return
  }

  try {
    const res = await $fetch<{ ok: boolean }>('/api/auth/verify-email', {
      method: 'POST',
      body: { token },
    })
    status.value = res.ok ? 'done' : 'failed'
    if (user.value) user.value = { ...user.value, emailVerified: true }
  }
  catch (err) {
    status.value = 'failed'
    message.value = authErrorMessage(err)
  }
})
</script>

<template>
  <AuthCard title="邮箱验证">
    <div class="space-y-3 text-sm text-fg-muted">
      <p v-if="status === 'pending'">正在验证…</p>

      <template v-else-if="status === 'done'">
        <p class="text-fg-default">
          邮箱验证完成，现在可以在栈桥发布项目了。
        </p>
        <div class="flex gap-2">
          <NuxtLink
            to="/me"
            class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white no-underline"
          >
            去个人中心
          </NuxtLink>
          <NuxtLink
            to="/projects"
            class="inline-flex h-8 items-center card px-3 text-sm no-underline hover:border-accent hover:text-accent"
          >
            逛逛项目
          </NuxtLink>
        </div>
      </template>

      <template v-else>
        <p class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
          {{ message || '验证失败' }}
        </p>
        <NuxtLink to="/me" class="no-underline hover:underline">去个人中心重新发送验证邮件</NuxtLink>
      </template>
    </div>
  </AuthCard>
</template>
