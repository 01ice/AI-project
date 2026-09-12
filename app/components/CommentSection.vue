<script setup lang="ts">
import type { CommentItem, TargetType } from '~~/shared/types'

const props = defineProps<{
  targetType: TargetType
  targetId: string
}>()

const user = useAuthUser()
const route = useRoute()

const { data, refresh } = await useFetch<{ items: CommentItem[] }>('/api/comments', {
  query: computed(() => ({ targetType: props.targetType, targetId: props.targetId })),
})

const draft = ref('')
const replyTo = ref<string | null>(null)
const replyDraft = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')

const total = computed(() => {
  const items = data.value?.items ?? []
  return items.reduce((sum, item) => sum + 1 + item.replies.length, 0)
})

async function submit(parent: CommentItem | null, isReply: boolean) {
  const content = (isReply ? replyDraft.value : draft.value).trim()
  if (!content) return

  busy.value = true
  error.value = ''
  notice.value = ''

  try {
    await $fetch('/api/comments', {
      method: 'POST',
      body: {
        targetType: props.targetType,
        targetId: props.targetId,
        content,
        parentId: parent ? parent.id : null,
      },
    })

    if (isReply) {
      replyDraft.value = ''
      replyTo.value = null
    }
    else {
      draft.value = ''
    }
    notice.value = '评论已发布'
    await refresh()
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
  finally {
    busy.value = false
  }
}

async function remove(id: string) {
  error.value = ''
  try {
    await $fetch(`/api/comments/${id}`, { method: 'DELETE' })
    notice.value = '评论已删除'
    await refresh()
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
}

function canDelete(comment: CommentItem) {
  if (!user.value) return false
  return comment.authorUsername === user.value.username || user.value.role === 'admin'
}
</script>

<template>
  <section class="card">
    <h2 class="border-b border-border-muted px-5 py-3.5 text-sm font-semibold text-fg-default">
      评论 {{ total }}
    </h2>

    <div class="border-b border-border-default bg-canvas-subtle px-5 py-3">
      <template v-if="user">
        <p v-if="!user.emailVerified" class="rounded-md border border-attention/40 bg-attention/5 px-3 py-2 text-xs text-attention">
          邮箱验证后才能参与讨论，请到个人中心完成验证。
        </p>
        <template v-else>
          <textarea
            v-model="draft"
            rows="3"
            maxlength="1000"
            placeholder="说点什么…"
            class="w-full card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              :disabled="busy || !draft.trim()"
              class="h-8 rounded-md border border-accent bg-accent px-3 text-sm font-medium text-white disabled:opacity-50"
              @click="submit(null, false)"
            >
              {{ busy ? '发布中…' : '发表评论' }}
            </button>
            <span class="text-xs text-fg-subtle">{{ draft.length }}/1000</span>
            <span v-if="notice" class="text-xs text-success">{{ notice }}</span>
            <span v-if="error" class="text-xs text-danger">{{ error }}</span>
          </div>
        </template>
      </template>

      <p v-else class="text-xs text-fg-muted">
        <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="no-underline hover:underline">登录</NuxtLink>
        后可以参与讨论，还没有账号就
        <NuxtLink to="/register" class="no-underline hover:underline">注册一个</NuxtLink>。
      </p>
    </div>

    <ul v-if="data?.items.length" class="divide-y divide-border-muted">
      <li v-for="comment in data.items" :key="comment.id" class="px-5 py-4">
        <div class="flex gap-3">
          <AppAvatar :name="comment.authorName" :username="comment.authorUsername" :size="28" :image-url="comment.authorAvatarUrl" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="font-medium text-fg-default">{{ comment.authorName }}</span>
              <span class="text-fg-subtle">{{ relativeTime(comment.createdAt) }}</span>
              <button
                v-if="user?.emailVerified"
                type="button"
                class="text-fg-subtle hover:text-accent"
                @click="replyTo = replyTo === comment.id ? null : comment.id"
              >
                回复
              </button>
              <button
                v-if="canDelete(comment)"
                type="button"
                class="text-fg-subtle hover:text-danger"
                @click="remove(comment.id)"
              >
                删除
              </button>
            </div>

            <p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg-default">{{ comment.content }}</p>

            <div v-if="replyTo === comment.id" class="mt-2">
              <textarea
                v-model="replyDraft"
                rows="2"
                maxlength="1000"
                :placeholder="`回复 ${comment.authorName}`"
                class="w-full card px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <div class="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  :disabled="busy || !replyDraft.trim()"
                  class="h-8 rounded-md border border-accent bg-accent px-3 text-xs font-medium text-white disabled:opacity-50"
                  @click="submit(comment, true)"
                >
                  回复
                </button>
                <button type="button" class="h-8 rounded-md px-2 text-xs text-fg-muted" @click="replyTo = null">
                  取消
                </button>
              </div>
            </div>

            <ul v-if="comment.replies.length" class="mt-3 space-y-3 border-l-2 border-border-muted pl-4">
              <li v-for="reply in comment.replies" :key="reply.id" class="flex gap-3">
                <AppAvatar :name="reply.authorName" :username="reply.authorUsername" :size="24" :image-url="reply.authorAvatarUrl" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="font-medium text-fg-default">{{ reply.authorName }}</span>
                    <span v-if="reply.replyToName" class="text-fg-subtle">回复 {{ reply.replyToName }}</span>
                    <span class="text-fg-subtle">{{ relativeTime(reply.createdAt) }}</span>
                    <button
                      v-if="user?.emailVerified"
                      type="button"
                      class="text-fg-subtle hover:text-accent"
                      @click="replyTo = comment.id; replyDraft = `@${reply.authorName} `"
                    >
                      回复
                    </button>
                    <button
                      v-if="canDelete(reply)"
                      type="button"
                      class="text-fg-subtle hover:text-danger"
                      @click="remove(reply.id)"
                    >
                      删除
                    </button>
                  </div>
                  <p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg-default">{{ reply.content }}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>

    <p v-else class="px-5 py-10 text-center text-sm text-fg-muted">
      还没有评论，来做第一个。
    </p>
  </section>
</template>
