<script setup lang="ts">
import type { ManagedPost, ProjectListResponse, TagItem } from '~~/shared/types'

const props = withDefaults(defineProps<{
  initial?: ManagedPost | null
}>(), {
  initial: null,
})

const user = useAuthUser()
const route = useRoute()

const form = reactive({
  title: props.initial?.title ?? '',
  slug: props.initial?.slug ?? '',
  summary: props.initial?.summary ?? '',
  body: props.initial?.body ?? '',
  coverUrl: props.initial?.coverUrl ?? '',
  tags: [...(props.initial?.tags ?? [])] as string[],
  projectSlugs: [...(props.initial?.projectSlugs ?? [])] as string[],
})

const currentSlug = ref(props.initial?.slug ?? '')
const mode = ref<'edit' | 'split' | 'preview'>('edit')

const modeOptions: { value: 'edit' | 'split' | 'preview', label: string }[] = [
  { value: 'edit', label: 'Markdown' },
  { value: 'split', label: '对比' },
  { value: 'preview', label: '预览' },
]
const saveState = ref<'idle' | 'saving' | 'saved' | 'dirty'>('idle')
const savedAt = ref('')
const error = ref('')
const publishOpen = ref(route.query.publish === '1')
const publishing = ref(false)
const showAdvanced = ref(false)

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const previewHtml = ref('')
const previewLoading = ref(false)

const cursor = reactive({ line: 1, column: 1 })
const newTag = ref('')
const projectKeyword = ref('')

const { data: tagOptions } = await useFetch<TagItem[]>('/api/tags', { query: { limit: 100 } })
const { data: projectOptions } = await useFetch<ProjectListResponse>('/api/projects', {
  query: { pageSize: 100 },
})

const tagSuggestions = computed(() =>
  (tagOptions.value ?? []).filter(tag => !form.tags.includes(tag.name)).slice(0, 20),
)

const filteredProjects = computed(() => {
  const keyword = projectKeyword.value.trim().toLowerCase()
  const items = projectOptions.value?.items ?? []
  if (!keyword) return items
  return items.filter(item => item.title.toLowerCase().includes(keyword))
})

const charCount = computed(() => form.body.length)
const lineCount = computed(() => form.body.split('\n').length)
const titleMax = 100

const saveStateText = computed(() => {
  switch (saveState.value) {
    case 'saving': return '正在保存…'
    case 'saved': return `已自动保存 ${savedAt.value}`
    case 'dirty': return '有未保存的修改'
    default: return '尚未保存'
  }
})

function replaceSelection(before: string, after = '', placeholder = '') {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = form.body.slice(start, end) || placeholder
  const next = form.body.slice(0, start) + before + selected + after + form.body.slice(end)
  form.body = next

  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + before.length, start + before.length + selected.length)
    updateCursor()
  })
}

function insertLinePrefix(prefix: string) {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const lineStart = form.body.lastIndexOf('\n', start - 1) + 1
  form.body = `${form.body.slice(0, lineStart)}${prefix}${form.body.slice(lineStart)}`

  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length)
    updateCursor()
  })
}

function insertBlock(text: string) {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const needsLeadingBreak = start > 0 && form.body[start - 1] !== '\n'
  const chunk = `${needsLeadingBreak ? '\n' : ''}${text}\n`

  form.body = form.body.slice(0, start) + chunk + form.body.slice(el.selectionEnd)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + chunk.length, start + chunk.length)
    updateCursor()
  })
}

function updateCursor() {
  const el = textareaRef.value
  if (!el) return
  const upto = form.body.slice(0, el.selectionStart)
  const lines = upto.split('\n')
  cursor.line = lines.length
  cursor.column = (lines[lines.length - 1] ?? '').length + 1
}

async function onPickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  error.value = ''
  try {
    const data = new FormData()
    data.append('file', file)
    const res = await $fetch<{ url: string }>('/api/upload', { method: 'POST', body: data })
    insertBlock(`![${file.name.replace(/\.[^.]+$/, '')}](${res.url})`)
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
  finally {
    uploading.value = false
    input.value = ''
  }
}

async function refreshPreview() {
  previewLoading.value = true
  try {
    const res = await $fetch<{ html: string }>('/api/markdown/preview', {
      method: 'POST',
      body: { text: form.body },
    })
    previewHtml.value = res.html
  }
  catch {
    // 预览失败不影响继续写正文
  }
  finally {
    previewLoading.value = false
  }
}

watch(mode, (value) => {
  if (value !== 'edit') refreshPreview()
})

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

    const created = !currentSlug.value
    currentSlug.value = res.slug
    form.slug = res.slug
    saveState.value = 'saved'
    savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    if (created) {
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

let autosaveTimer: ReturnType<typeof setTimeout> | null = null

watch(form, () => {
  if (!user.value) return
  saveState.value = 'dirty'
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    if (!form.title.trim() && !form.body.trim()) return
    save('draft')
    if (mode.value !== 'edit') refreshPreview()
  }, 5000)
}, { deep: true })

onUnmounted(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
})

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    save('draft')
  }
}

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

/** 从正文提取纯文本作为摘要；真正的 AI 摘要等 DeepSeek Key 配好后再接 */
function generateSummary() {
  const plain = form.body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  form.summary = plain.slice(0, 140)
}

async function publish() {
  publishing.value = true
  error.value = ''

  if (form.title.trim().length < 4) {
    error.value = '标题至少 4 个字'
    publishing.value = false
    return
  }
  if (form.body.trim().length < 50) {
    error.value = '正文至少 50 个字，写点实在的内容吧'
    publishing.value = false
    return
  }

  const res = await save('pending')
  publishing.value = false

  if (res) {
    publishOpen.value = false
    await navigateTo({ path: '/me/posts', query: { result: res.status } })
  }
}

function openPublish() {
  error.value = ''
  publishOpen.value = true
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="flex h-14 items-center gap-3 border-b border-border-default px-4">
      <NuxtLink
        to="/me/posts"
        class="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-fg-muted no-underline hover:bg-canvas-subtle hover:text-fg-default"
      >
        ‹ 返回
      </NuxtLink>

      <input
        v-model="form.title"
        :maxlength="titleMax"
        placeholder="请输入文章标题（5~100 个字）"
        class="h-9 flex-1 border-0 bg-transparent px-2 text-base font-medium text-fg-default placeholder:text-fg-subtle focus:outline-none"
      >
      <span class="text-xs text-fg-subtle">{{ form.title.length }}/{{ titleMax }}</span>

      <span class="hidden text-xs sm:inline" :class="saveState === 'dirty' ? 'text-attention' : 'text-fg-subtle'">
        {{ saveStateText }}
      </span>

      <AppAvatar
        v-if="user"
        :name="user.nickname"
        :username="user.username"
        :size="28"
        :image-url="user.avatarUrl"
        class="ml-1"
      />

      <button
        type="button"
        class="h-8 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90"
        @click="openPublish"
      >
        发布文章
      </button>
    </header>

    <p v-if="error && !publishOpen" class="border-b border-danger/30 bg-danger/5 px-4 py-2 text-xs text-danger">
      {{ error }}
    </p>

    <div class="flex flex-wrap items-center gap-2 border-b border-border-default px-4 py-2">
      <div class="flex items-center gap-1 rounded-md bg-canvas-subtle p-0.5">
        <button
          v-for="option in modeOptions"
          :key="option.value"
          type="button"
          class="rounded px-3 py-1 text-xs"
          :class="mode === option.value ? 'bg-canvas font-medium text-fg-default shadow-sm' : 'text-fg-muted hover:text-fg-default'"
          @click="mode = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="h-5 w-px bg-border-default" />

      <div class="flex flex-wrap items-center gap-0.5">
        <button type="button" title="加粗" class="editor-tool font-bold" @click="replaceSelection('**', '**', '加粗文字')">B</button>
        <button type="button" title="斜体" class="editor-tool italic" @click="replaceSelection('*', '*', '斜体文字')">I</button>
        <button type="button" title="二级标题" class="editor-tool font-semibold" @click="insertLinePrefix('## ')">H</button>
        <button type="button" title="删除线" class="editor-tool line-through" @click="replaceSelection('~~', '~~', '删除线')">S</button>

        <div class="mx-1 h-5 w-px bg-border-default" />

        <button type="button" title="无序列表" class="editor-tool" @click="insertLinePrefix('- ')">列表</button>
        <button type="button" title="有序列表" class="editor-tool" @click="insertLinePrefix('1. ')">编号</button>
        <button type="button" title="引用" class="editor-tool" @click="insertLinePrefix('> ')">引用</button>
        <button type="button" title="代码块" class="editor-tool" @click="insertBlock('```ts\n// 代码\n```')">代码块</button>
        <button type="button" title="行内代码" class="editor-tool" @click="replaceSelection('`', '`', 'code')">code</button>

        <div class="mx-1 h-5 w-px bg-border-default" />

        <button type="button" title="链接" class="editor-tool" @click="replaceSelection('[', '](https://)', '链接文字')">链接</button>
        <button
          type="button"
          title="插入图片"
          class="editor-tool"
          :disabled="uploading"
          @click="imageInputRef?.click()"
        >
          {{ uploading ? '上传中…' : '图片' }}
        </button>
        <button type="button" title="表格" class="editor-tool" @click="insertBlock('| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |')">表格</button>
        <button type="button" title="分割线" class="editor-tool" @click="insertBlock('---')">分割线</button>
      </div>

      <span class="ml-auto hidden text-xs text-fg-subtle sm:inline">Ctrl/⌘ + S 存草稿</span>

      <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="onPickImage">
    </div>

    <div class="flex flex-1 overflow-hidden">
      <textarea
        v-show="mode !== 'preview'"
        ref="textareaRef"
        v-model="form.body"
        placeholder="开始写正文，支持 Markdown 语法…"
        class="min-h-[60vh] w-full flex-1 resize-none border-0 bg-canvas px-6 py-5 font-mono text-[14px] leading-7 text-fg-default placeholder:text-fg-subtle focus:outline-none"
        @click="updateCursor"
        @keyup="updateCursor"
        @keydown="onKeydown"
      />

      <div
        v-if="mode !== 'edit'"
        class="max-h-[80vh] flex-1 overflow-y-auto border-l border-border-default px-6 py-5"
      >
        <p v-if="previewLoading" class="text-xs text-fg-muted">正在渲染…</p>
        <!-- 预览内容经过与服务端相同的白名单过滤 -->
        <div v-else class="markdown-body" v-html="previewHtml" />
      </div>
    </div>
    <footer class="flex flex-wrap items-center gap-4 border-t border-border-default px-4 py-2 text-xs text-fg-muted">
      <span>Markdown {{ charCount }} 字</span>
      <span>{{ lineCount }} 行</span>
      <span>当前行 {{ cursor.line }}，当前列 {{ cursor.column }}</span>
      <span class="hidden sm:inline" :class="saveState === 'dirty' ? 'text-attention' : 'text-fg-subtle'">
        {{ saveStateText }}
      </span>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="h-8 card px-3 text-xs hover:border-accent hover:text-accent"
          @click="save('draft')"
        >
          保存草稿
        </button>
        <button
          type="button"
          class="h-8 rounded-md border border-accent bg-accent px-4 text-xs font-medium text-white hover:bg-accent/90"
          @click="openPublish"
        >
          发布文章
        </button>
      </div>
    </footer>

    <div v-if="publishOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div class="w-full max-w-[720px] rounded-lg border border-border-default bg-canvas">
        <header class="flex items-center justify-between border-b border-border-muted px-5 py-3.5">
          <h2 class="text-base font-semibold text-fg-default">发布文章</h2>
          <button type="button" class="text-lg text-fg-muted hover:text-fg-default" @click="publishOpen = false">×</button>
        </header>

        <div class="space-y-5 px-5 py-5">
          <p v-if="error" class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
            {{ error }}
          </p>

          <div>
            <p class="mb-1 text-sm font-medium text-fg-default">
              文章标签 <span class="text-danger">*</span>
              <span class="text-xs font-normal text-fg-subtle">最多 8 个</span>
            </p>
            <div v-if="form.tags.length" class="mb-2 flex flex-wrap gap-1.5">
              <button
                v-for="tag in form.tags"
                :key="tag"
                type="button"
                class="inline-flex items-center gap-1 rounded border border-accent bg-accent-subtle px-2 py-0.5 text-xs text-accent"
                @click="toggleTag(tag)"
              >
                {{ tag }} ×
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="newTag"
                placeholder="+ 添加文章标签"
                maxlength="16"
                class="h-8 w-40 rounded-control border border-border-default px-2 text-sm focus:border-accent focus:outline-none"
                @keydown.enter.prevent="addCustomTag"
              >
              <button
                v-for="tag in tagSuggestions.slice(0, 8)"
                :key="tag.id"
                type="button"
                class="rounded-control border border-border-default bg-canvas-subtle px-2 py-0.5 text-xs text-fg-muted hover:border-accent hover:text-accent"
                @click="toggleTag(tag.name)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>

          <div>
            <p class="mb-1 text-sm font-medium text-fg-default">添加封面</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
              <ImageUpload v-model="form.coverUrl" label="上传封面（可选）" aspect="aspect-[16/9]" />
              <div class="rounded-md border border-dashed border-border-default bg-canvas-subtle px-3 py-4 text-xs text-fg-subtle">
                正文里插入的图片会自动上传并保留在文章中；封面不填时会生成一张占位图。
              </div>
            </div>
          </div>

          <div>
            <p class="mb-1 text-sm font-medium text-fg-default">文章摘要</p>
            <textarea
              v-model="form.summary"
              rows="3"
              maxlength="300"
              placeholder="会显示在博客列表与搜索结果里"
              class="w-full rounded-control border border-border-default px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <div class="mt-1 flex items-center gap-3">
              <button
                type="button"
                class="rounded-control border border-border-default px-2 py-1 text-xs hover:border-accent hover:text-accent"
                @click="generateSummary"
              >
                从正文提取摘要
              </button>
              <span class="text-xs text-fg-subtle">{{ form.summary.length }}/300</span>
            </div>
          </div>

          <div>
            <p class="mb-1 text-sm font-medium text-fg-default">
              关联项目
              <span class="text-xs font-normal text-fg-subtle">最多 10 个，会显示在项目详情页</span>
            </p>
            <input
              v-model="projectKeyword"
              placeholder="搜索项目名"
              class="h-8 w-full rounded-control border border-border-default px-2 text-sm focus:border-accent focus:outline-none"
            >
            <div class="mt-2 max-h-44 overflow-y-auto rounded border border-border-muted p-2">
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
                <span class="text-fg-subtle">{{ project.categoryName }}</span>
              </label>
              <p v-if="!filteredProjects.length" class="px-1 py-2 text-xs text-fg-subtle">没有匹配的项目</p>
            </div>
          </div>

          <div>
            <button type="button" class="text-xs text-accent hover:underline" @click="showAdvanced = !showAdvanced">
              {{ showAdvanced ? '收起高级设置' : '高级设置：网址标识' }}
            </button>
            <div v-if="showAdvanced" class="mt-2">
              <input
                v-model="form.slug"
                placeholder="留空自动生成，例如 my-article"
                class="h-8 w-full rounded-control border border-border-default px-2 font-mono text-sm focus:border-accent focus:outline-none"
              >
              <p class="mt-1 text-xs text-fg-subtle">文章地址：/blog/{{ form.slug || '（自动生成）' }}</p>
            </div>
          </div>

          <p class="card bg-canvas-subtle px-3 py-2 text-xs text-fg-muted">
            {{ user?.role === 'admin' ? '管理员发布后立即上线。' : '发布后进入审核队列，通过后出现在博客里。' }}
            也可以先「保存草稿」继续写。
          </p>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-border-default px-5 py-3">
          <button
            type="button"
            class="h-8 card px-4 text-sm hover:border-accent hover:text-accent"
            @click="publishOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="publishing"
            class="h-8 rounded-md border border-accent bg-accent px-5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
            @click="publish"
          >
            {{ publishing ? '提交中…' : '发布文章' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-tool {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-fg-default);
}

.editor-tool:hover {
  background: var(--color-canvas-subtle);
}

.editor-tool:disabled {
  opacity: 0.5;
}
</style>
