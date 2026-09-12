<script setup lang="ts">
import type { ProjectFormPayload } from '~~/shared/types'

useHead({ title: '发布项目 · 栈桥' })

const user = useAuthUser()
const error = ref('')
const busy = ref(false)

async function submit(payload: ProjectFormPayload, status: 'draft' | 'pending') {
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ slug: string, status: string }>('/api/projects', {
      method: 'POST',
      body: { ...payload, status },
    })
    await navigateTo({ path: '/me/projects', query: { result: res.status } })
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[820px]">
    <header class="mb-5">
      <h1 class="text-xl font-semibold text-fg-default">发布项目</h1>
      <p class="mt-2 text-sm text-fg-muted">
        把你做的东西放上来。填得越具体，别人越容易判断它值不值得看——
        尤其是模型、成本和收益这些真实数字。
      </p>
    </header>

    <div
      v-if="!user"
      class="card p-6 text-center"
    >
      <p class="text-sm text-fg-muted">发布项目需要先登录。</p>
      <div class="mt-3 flex justify-center gap-2">
        <NuxtLink
          to="/login?redirect=/projects/new"
          class="inline-flex h-8 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white no-underline"
        >
          去登录
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="inline-flex h-8 items-center card px-4 text-sm no-underline hover:border-accent hover:text-accent"
        >
          注册账号
        </NuxtLink>
      </div>
    </div>

    <div
      v-else-if="!user.emailVerified"
      class="rounded-md border border-attention/40 bg-attention/5 p-6"
    >
      <p class="text-sm text-attention">
        发布项目前需要先验证邮箱（{{ user.email }}）。
      </p>
      <NuxtLink to="/me" class="mt-3 inline-block text-sm text-accent no-underline hover:underline">
        去个人中心重新发送验证邮件 →
      </NuxtLink>
    </div>

    <ProjectForm v-else :busy="busy" :error-message="error" @submit="submit" />
  </div>
</template>
