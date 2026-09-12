<script setup lang="ts">
import type { TargetType } from '~~/shared/types'

const props = defineProps<{
  targetType: TargetType
  targetId: string
}>()

const user = useAuthUser()
const route = useRoute()

const open = ref(false)
const reason = ref('spam')
const detail = ref('')
const busy = ref(false)
const message = ref('')

const reasons = [
  { value: 'spam', label: '垃圾信息 / 刷屏' },
  { value: 'ad', label: '广告推广' },
  { value: 'abuse', label: '辱骂或不当内容' },
  { value: 'wrong', label: '信息错误 / 误导' },
  { value: 'other', label: '其他' },
]

async function submit() {
  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: {
        targetType: props.targetType,
        targetId: props.targetId,
        reason: reason.value,
        detail: detail.value,
      },
    })
    message.value = '已收到举报，我们会尽快处理'
    open.value = false
    detail.value = ''
  }
  catch (err) {
    message.value = authErrorMessage(err)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <button
      v-if="!open"
      type="button"
      class="w-full rounded-md px-3 py-2 text-xs text-fg-muted hover:text-danger"
      @click="open = true"
    >
      举报{{ targetType === 'project' ? '该项目' : '该文章' }}
    </button>

    <div v-else class="rounded-md border border-border-default bg-canvas-subtle p-3">
      <template v-if="user">
        <p class="text-xs font-medium text-fg-default">举报原因</p>
        <select
          v-model="reason"
          class="mt-2 h-8 w-full rounded-md border border-border-default bg-canvas px-2 text-sm focus:border-accent focus:outline-none"
        >
          <option v-for="item in reasons" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <textarea
          v-model="detail"
          rows="2"
          maxlength="500"
          placeholder="补充说明（选填）"
          class="mt-2 w-full rounded-md border border-border-default bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            :disabled="busy"
            class="h-8 rounded-md border border-danger px-3 text-xs font-medium text-danger disabled:opacity-60"
            @click="submit"
          >
            {{ busy ? '提交中…' : '提交举报' }}
          </button>
          <button type="button" class="h-8 rounded-md px-2 text-xs text-fg-muted" @click="open = false">
            取消
          </button>
        </div>
      </template>

      <p v-else class="text-xs text-fg-muted">
        <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="no-underline hover:underline">登录</NuxtLink>
        后可以举报。
      </p>
    </div>

    <p v-if="message" class="mt-2 text-xs text-fg-muted">{{ message }}</p>
  </div>
</template>
