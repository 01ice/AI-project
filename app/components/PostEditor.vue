<script setup lang="ts">
import type { ManagedPost, PostDetail, ProjectListResponse, TagItem } from '~~/shared/types'

const props = withDefaults(defineProps<{
  initial?: ManagedPost | null
}>(), {
  initial: null,
})

const user = useAuthUser()

const form = reactive({
  title: props.initial?.title ?? '',
  slug: props.initial?.slug ?? '',
  summary: props.initial?.summary ?? '',
  body: props.initial?.body ?? '',
  coverUrl: props.initial?.coverUrl ?? '',
  tags: [...(props.initial?.tags ?? [])],
  projectSlugs: [...(props.initial?.projectSlugs ?? [])],
})

const currentSlug = ref(props.initial?.slug ?? '')
const error = ref('')
const notice = ref('')
const saveState = ref<'idle' | 'saving' | 'saved' | 'dirty'>('idle')
const savedAt = ref('')
const publishing = ref(false)
const showPreview = ref(false)
const previewHtml = ref('')
const previewing = ref(false)
const newTag = ref('')
const projectKeyword = ref('')

const { data: tagOptions } = await useFetch<TagItem[]>('/api/tags', { query: { limit: 100 } })
const { data: projectOptions } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { pageSize: 100 },
})

const tagSuggestions = computed(() =>
  (tagOptions.value ?? []).filter(tag => !form.tags.includes(tag.name)).slice(0, 24),
)

const filteredProjects = computed(() => {
  const keyword = projectKeyword.value.trim().toLowerCase()
  const items = projectOptions.value?.items ?? []
  if (!keyword) return items
  return items.filter(item => item.title.toLowerCase().includes(keyword))
})

function toggleTag(name: string) {
  const index = form.tags.indexOf(name)
  if (index >= 0) form.tags.splice(index, 1)
  else if (form.tags.length < 8) form.tags.push(name)
}

function addCustomTag() {
  const name = newTag.value.trim()
  if (!name || form.tags.includes(name) || form.tags.length >= 8) return
  form.tags.push(name)
  newTag.value = ''
}

function toggleProject(slug: string) {
  const index = form.projectSlugs.indexOf(slug)
  if (index >= 0) form.projectSlugs.splice(index, 1)
  else if (form.projectSlugs.length < 10) form.projectSlugs.push(slug)
}

async function save(status: 'draft' | 'pending') {
  error.value = ''
  saveState.value = 'saving'

  const payload = {
    title: form.title.trim() || '未命名草稿',
    slug: form.slug.trim() || undefined,
    summary: form.summary.trim(),
    body: form.body,
    coverUrl: form.coverUrl,
    tags: form.tags,
    projectSlugs: form.projectSlugs,
    status,
  }

  try {
    const res = currentSlug.value
      ? await $fetch<{ slug: string, status: string }>(`/api/posts/${currentSlug.value}`, {
          method: 'PUT',
          body: payload,
        })
      : await $fetch<{ slug: string, status: string }>('/api/posts', {
          method: 'POST',
          body: payload,
        })

    const isNew = !currentSlug.value
    currentSlug.value = res.slug
    form.slug = res.slug
    saveState.value = 'saved'
    savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    if (isNew) {
      await navigateTo(`/blog/edit/${res.slug}`, { replace: true })
    }

    return res
  }
  catch (err) {
    saveState.value = 'dirty'
    error.value = authErrorMessage(err)
    return null
  }
}

// 自动保存：停止输入 5 秒后存草稿
let autosaveTimer: ReturnType<typeof setTimeout> | null = null

watch(form, () => {
  if (!user.value) return
  saveState.value = 'dirty'
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    if (!form.title.trim() && !form.body.trim()) return
    save('draft')
  }, 5000)
}, { deep: true })

onUnmounted(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
})

async function publish() {
  publishing.value = true
  notice.value = ''
  const res = await save('pending')
  if (res) {
    notice.value = res.status === 'published'
      ? '已发布，文章现在可以在博客里看到了。'
      : '已提交审核，通过后会出现在博客里。'
    await navigateTo({ path: '/me/posts', query: { result: res.status } })
  }
  publishing.value = false
}

async function togglePreview() {
  showPreview.value = !showPreview.value
  if (!showPreview.value) return
  previewing.value = true
  try {
    const res = await $fetch<{ html: string }>('/api/markdown/preview', {
      method: 'POST',
      body: { text: form.body },
    })
    previewHtml.value = res.html
  }
  finally {
    previewing.value = false
  }
}

const saveStateText = computed(() => {
  switch (saveState.value) {
    case 'saving': return '正在保存…'
    case 'saved': return `已自动保存 ${savedAt.value}`
    case 'dirty': return '有未保存的修改'
    default: return ''
  }
})
</script>

<template>
  <form class="space-y-5" @submit.prevent="publish">
    <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
      {{ error }}
    </p>
    <p v-if="notice" class="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
      {{ notice }}
    </p>

    <section class="rounded-md border border-border-default bg-canvas p-5">
      <FormField label="标题">
        <input
          v-model="form.title"
          placeholder="给文章起个标题"
          maxlength="120"
          class="h-9 w-full rounded-md border border-border-default bg-canvas px-3 text-base focus:border-accent focus:outline-none"
        >
      </FormField>

      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="摘要" hint="留空会用正文前 140 字自动生成">
          <textarea
            v-model="form.summary"
            rows="3"
            maxlength="300"
            placeholder="一两句话说明这篇文章讲了什么"
            class="w-full rounded-md border border-border-default bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </FormField>

        <div>
          <p class="mb-1 text-sm font-medium text-fg-default">封面</p>
          <ImageUpload v-model="form.coverUrl" label="上传封面（可选）" aspect="aspect-[16/7]" />
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="网址标识 slug" hint="留空自动生成；中文标题会生成随机标识">
          <input
            v-model="form.slug"
            placeholder="my-article"
            class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 font-mono text-sm focus:border-accent focus:outline-none"
          >
        </FormField>

        <div>
          <p class="mb-1 text-sm font-medium text-fg-default">
            关联项目
            <span class="text-xs font-normal text-fg-subtle">最多 10 个</span>
          </p>
          <input
            v-model="projectKeyword"
            placeholder="搜索项目名"
            class="h-8 w-full rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
          >
          <div class="mt-2 max-h-40 overflow-y-auto rounded-md border border-border-muted p-2">
            <label
              v-for="project in filteredProjects"
              :key="project.slug"
              class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-canvas-subtle"
            >
              <input
                type="checkbox"
                class="h-3.5 w-3.5"
                :checked="form.projectSlugs.includes(project.slug)"
                @change="toggleProject(project.slug)"
              >
              <span class="text-fg-default">{{ project.title }}</span>
            </label>
            <p v-if="!filteredProjects.length" class="px-1 py-2 text-xs text-fg-subtle">没有匹配的项目</p>
          </div>
          <p v-if="form.projectSlugs.length" class="mt-1 text-xs text-fg-subtle">
            已选 {{ form.projectSlugs.length }} 个：{{ form.projectSlugs.join('、') }}
          </p>
        </div>
      </div>

      <div class="mt-4">
        <p class="mb-1 text-sm font-medium text-fg-default">
          标签
          <span class="text-xs font-normal text-fg-subtle">最多 8 个，选已有的或自己写</span>
        </p>

        <div v-if="form.tags.length" class="mb-2 flex flex-wrap gap-1.5">
          <button
            v-for="tag in form.tags"
            :key="tag"
            type="button"
            class="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-subtle px-2.5 py-0.5 text-xs text-accent"
            @click="toggleTag(tag)"
          >
            {{ tag }} ×
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="newTag"
            placeholder="输入新标签后回车"
            maxlength="16"
            class="h-8 w-40 rounded-md border border-border-default bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
            @keydown.enter.prevent="addCustomTag"
          >
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tag in tagSuggestions"
              :key="tag.id"
              type="button"
              class="rounded-full border border-border-default bg-canvas-subtle px-2.5 py-0.5 text-xs text-fg-muted hover:border-accent hover:text-accent"
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-md border border-border-default bg-canvas p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-fg-default">正文</h2>
        <button type="button" class="text-xs text-accent hover:underline" @click="togglePreview">
          {{ showPreview ? '继续编辑' : '预览' }}
        </button>
      </div>

      <div v-if="showPreview" class="mt-3 rounded-md border border-border-default p-4">
        <span v-if="previewing" class="text-xs text-fg-muted">正在渲染…</span>
        <!-- 预览内容经过与服务端相同的白名单过滤 -->
        <div v-else class="markdown-body" v-html="previewHtml" />
      </div>

      <textarea
        v-else
        v-model="form.body"
        rows="20"
        placeholder="支持 Markdown：## 小标题、- 列表、**加粗**、`代码`、```代码块```"
        class="mt-3 w-full rounded-md border border-border-default bg-canvas px-3 py-2 font-mono text-[13px] leading-6 focus:border-accent focus:outline-none"
      />

      <p class="mt-1 text-right text-xs text-fg-subtle">{{ form.body.length }} 字</p>
    </section>

    <div class="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border-default bg-canvas/95 py-3">
      <button
        type="submit"
        :disabled="publishing"
        class="h-9 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {{ publishing ? '提交中…' : '发表文章' }}
      </button>
      <button
        type="button"
        class="h-9 rounded-md border border-border-default px-4 text-sm hover:border-accent hover:text-accent"
        @click="save('draft')"
      >
        存草稿
      </button>
      <span class="text-xs" :class="saveState === 'dirty' ? 'text-attention' : 'text-fg-subtle'">
        {{ saveStateText }}
      </span>
      <span class="ml-auto text-xs text-fg-subtle">
        发表后需要审核（管理员账号直接发布）
      </span>
    </div>
  </form>
</template>
