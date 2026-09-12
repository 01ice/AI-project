<script setup lang="ts">
import type {
  AiHosting,
  CategoryItem,
  ProjectFormPayload,
  RevenueModel,
  TagGroup,
  TagItem,
} from '~~/shared/types'

const props = withDefaults(defineProps<{
  initial?: Partial<ProjectFormPayload>
  submitLabel?: string
  busy?: boolean
  errorMessage?: string
}>(), {
  submitLabel: '提交审核',
  busy: false,
  errorMessage: '',
})

const emit = defineEmits<{ submit: [ProjectFormPayload, 'draft' | 'pending'] }>()

const { data: categories } = await useFetch<CategoryItem[]>('/api/categories')
const { data: allTags } = await useFetch<TagItem[]>('/api/tags', { query: { limit: 100 } })

const tagGroups = computed(() => {
  const groups: { key: TagGroup, label: string }[] = [
    { key: 'ai_model', label: '模型与供应商' },
    { key: 'ai_tech', label: 'AI 技术' },
    { key: 'ai_domain', label: '应用领域' },
    { key: 'stack', label: '技术栈' },
  ]
  return groups
    .map(group => ({ ...group, items: (allTags.value ?? []).filter(tag => tag.group === group.key) }))
    .filter(group => group.items.length)
})

const initial = props.initial ?? {}

const form = reactive({
  title: initial.title ?? '',
  summary: initial.summary ?? '',
  body: initial.body ?? '',
  coverUrl: initial.coverUrl ?? '',
  screenshots: [...(initial.screenshots ?? [])],
  categoryId: initial.categoryId ?? '',
  repoUrl: initial.repoUrl ?? '',
  demoUrl: initial.demoUrl ?? '',
  extraLinks: [...(initial.extraLinks ?? [])],
  tagIds: [...(initial.tagIds ?? [])],
  isAi: initial.isAi ?? false,
  aiModels: (initial.aiModels ?? []).join(', '),
  aiHosting: (initial.aiHosting ?? '') as AiHosting | '',
  cost: initial.monthlyCostCny !== null && initial.monthlyCostCny !== undefined ? String(initial.monthlyCostCny) : '',
  revenue: initial.monthlyRevenueCny !== null && initial.monthlyRevenueCny !== undefined ? String(initial.monthlyRevenueCny) : '',
  total: initial.totalRevenueCny !== null && initial.totalRevenueCny !== undefined ? String(initial.totalRevenueCny) : '',
  revenueModel: (initial.revenueModel ?? '') as RevenueModel | '',
  costNote: initial.costNote ?? '',
  revenueNote: initial.revenueNote ?? '',
})

const newTag = reactive({ name: '', group: 'ai_domain' as TagGroup })
const newTags = ref<{ name: string, group: TagGroup }[]>([])

const errors = ref<string[]>([])

const revenueModelOptions: { value: RevenueModel, label: string }[] = [
  { value: 'free', label: '免费' },
  { value: 'freemium', label: '免费 + 付费' },
  { value: 'subscription', label: '订阅制' },
  { value: 'one_time', label: '一次性买断' },
  { value: 'ads', label: '广告' },
  { value: 'service', label: '接单服务' },
  { value: 'not_yet', label: '还没有收入' },
]

const hostingOptions: { value: AiHosting, label: string }[] = [
  { value: 'api', label: '调用 API' },
  { value: 'self_hosted', label: '本地部署' },
  { value: 'hybrid', label: '混合' },
]

function toggleTag(id: string) {
  const index = form.tagIds.indexOf(id)
  if (index >= 0) {
    form.tagIds.splice(index, 1)
  }
  else if (form.tagIds.length < 5) {
    form.tagIds.push(id)
  }
}

function addNewTag() {
  const name = newTag.name.trim()
  if (name.length < 2) return
  if (newTags.value.length >= 3) return
  if (newTags.value.some(tag => tag.name === name)) return
  newTags.value.push({ name, group: newTag.group })
  newTag.name = ''
}

function addLink() {
  if (form.extraLinks.length < 3) form.extraLinks.push({ label: '', url: '' })
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

function buildPayload(): ProjectFormPayload {
  return {
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: form.body.trim(),
    coverUrl: form.coverUrl,
    screenshots: form.screenshots.filter(Boolean),
    categoryId: form.categoryId,
    repoUrl: form.repoUrl.trim(),
    demoUrl: form.demoUrl.trim(),
    extraLinks: form.extraLinks.filter(link => link.label.trim() && link.url.trim()),
    tagIds: [...form.tagIds],
    newTags: [...newTags.value],
    isAi: form.isAi,
    aiModels: form.isAi
      ? form.aiModels.split(/[,，]/).map(model => model.trim()).filter(Boolean).slice(0, 6)
      : [],
    aiHosting: form.isAi && form.aiHosting ? form.aiHosting : null,
    monthlyCostCny: toNumber(form.cost),
    monthlyRevenueCny: toNumber(form.revenue),
    totalRevenueCny: toNumber(form.total),
    revenueModel: form.revenueModel || null,
    costNote: form.costNote.trim(),
    revenueNote: form.revenueNote.trim(),
  }
}

function validate(payload: ProjectFormPayload): string[] {
  const list: string[] = []
  if (payload.title.length < 2) list.push('标题至少 2 个字')
  if (payload.summary.length < 20) list.push('一句话简介至少 20 个字，写清楚这个项目是做什么的')
  if (payload.body.length > 300) list.push('补充说明最多 300 字，更长的内容请写成文章')
  if (!payload.coverUrl) list.push('请上传封面图')
  if (!payload.categoryId) list.push('请选择分类')
  if (payload.isAi && !payload.aiModels.length) list.push('AI 项目请至少填写一个模型')
  if (payload.isAi && !payload.aiHosting) list.push('AI 项目请选择模型使用方式')
  return list
}

function submit(status: 'draft' | 'pending') {
  const payload = buildPayload()
  const problems = validate(payload)
  errors.value = problems
  if (problems.length) return
  emit('submit', payload, status)
}

</script>

<template>
  <form class="space-y-6" @submit.prevent="submit('pending')">
    <p
      v-if="errorMessage || errors.length"
      class="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
    >
      {{ errorMessage }}
      <span v-for="item in errors" :key="item" class="block">{{ item }}</span>
    </p>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-fg-default">基本信息</h2>

      <div class="mt-4 space-y-4">
        <FormField label="项目标题">
          <input
            v-model="form.title"
            required
            maxlength="80"
            placeholder="例如：星图"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>

        <FormField label="一句话简介" hint="20-200 字，会显示在卡片和搜索结果里">
          <textarea
            v-model="form.summary"
            required
            rows="2"
            maxlength="200"
            placeholder="用一句话说清楚这个项目做什么、给谁用"
            class="w-full card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </FormField>

        <FormField label="分类">
          <select
            v-model="form.categoryId"
            required
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">请选择分类</option>
            <option v-for="category in categories ?? []" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </FormField>

        <div>
          <p class="mb-1 text-sm font-medium text-fg-default">
            技术栈标签
            <span class="ml-1 text-xs font-normal text-fg-subtle">最多 5 个</span>
          </p>
          <div v-for="group in tagGroups" :key="group.key" class="mb-2">
            <p class="mb-1 text-xs text-fg-subtle">{{ group.label }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="tag in group.items"
                :key="tag.id"
                type="button"
                class="rounded-full border px-2.5 py-0.5 text-xs"
                :class="form.tagIds.includes(tag.id)
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-border-default bg-canvas-subtle text-fg-muted hover:border-accent hover:text-accent'"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>

          <div class="mt-3 card bg-canvas-subtle p-3">
            <p class="text-xs text-fg-muted">
              没找到合适的标签？可以申请新标签，管理员审核通过后会出现在公共标签里（最多 3 个）。
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <input
                v-model="newTag.name"
                placeholder="标签名"
                maxlength="16"
                class="h-8 w-40 card px-3 text-sm focus:border-accent focus:outline-none"
              >
              <select
                v-model="newTag.group"
                class="h-8 card px-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="ai_model">模型与供应商</option>
                <option value="ai_tech">AI 技术</option>
                <option value="ai_domain">应用领域</option>
                <option value="stack">技术栈</option>
              </select>
              <button
                type="button"
                class="h-8 card px-3 text-sm hover:border-accent hover:text-accent"
                @click="addNewTag"
              >
                添加
              </button>
            </div>
            <div v-if="newTags.length" class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="(tag, index) in newTags"
                :key="tag.name"
                class="inline-flex items-center gap-1 rounded-full border border-attention/40 bg-attention/5 px-2.5 py-0.5 text-xs text-attention"
              >
                {{ tag.name }}（待审核）
                <button type="button" class="hover:text-danger" @click="newTags.splice(index, 1)">×</button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-fg-default">封面与截图</h2>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p class="mb-1 text-sm font-medium text-fg-default">封面图</p>
          <ImageUpload v-model="form.coverUrl" label="上传封面" />
        </div>
        <div>
          <p class="mb-1 text-sm font-medium text-fg-default">
            截图 <span class="text-xs font-normal text-fg-subtle">选填，最多 5 张</span>
          </p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ImageUpload
              v-for="(shot, index) in form.screenshots"
              :key="`${index}-${shot}`"
              :model-value="shot"
              label="替换"
              @update:model-value="value => (form.screenshots[index] = value)"
            />
            <ImageUpload
              v-if="form.screenshots.length < 5"
              :model-value="''"
              label="添加截图"
              @update:model-value="value => value && form.screenshots.push(value)"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-fg-default">
        补充说明
        <span class="ml-1 text-xs font-normal text-fg-subtle">选填，300 字以内</span>
      </h2>
      <p class="mt-1 text-xs text-fg-subtle">
        写清楚怎么用、有什么限制就够了。长篇的「怎么做出来的」「成本怎么算的」建议写成文章——
        文章与项目是多对多关联，会同时出现在两边的页面上。
      </p>

      <textarea
        v-model="form.body"
        rows="5"
        maxlength="300"
        placeholder="例如：支持 macOS 与 Windows，需要 Node 20 以上；本地优先，数据不上传。"
        class="mt-3 w-full card px-3 py-2 text-sm leading-6 focus:border-accent focus:outline-none"
      />
      <p class="mt-1 text-right text-xs text-fg-subtle">{{ form.body.length }} / 300</p>
    </section>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-fg-default">相关链接</h2>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="仓库地址" hint="选填，GitHub / Gitee 等">
          <input
            v-model="form.repoUrl"
            placeholder="https://github.com/..."
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
        <FormField label="演示链接" hint="选填，线上可访问的地址">
          <input
            v-model="form.demoUrl"
            placeholder="https://..."
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
      </div>

      <div class="mt-3">
        <div
          v-for="(link, index) in form.extraLinks"
          :key="index"
          class="mb-2 flex items-center gap-2"
        >
          <input
            v-model="link.label"
            placeholder="名称"
            maxlength="20"
            class="h-8 w-28 card px-3 text-sm focus:border-accent focus:outline-none"
          >
          <input
            v-model="link.url"
            placeholder="https://..."
            class="h-8 flex-1 card px-3 text-sm focus:border-accent focus:outline-none"
          >
          <button
            type="button"
            class="text-sm text-fg-muted hover:text-danger"
            @click="form.extraLinks.splice(index, 1)"
          >
            删除
          </button>
        </div>
        <button
          v-if="form.extraLinks.length < 3"
          type="button"
          class="text-xs text-accent hover:underline"
          @click="addLink"
        >
          + 添加其他链接
        </button>
      </div>
    </section>

    <section class="card p-5">
      <label class="flex items-center gap-2">
        <input v-model="form.isAi" type="checkbox" class="h-4 w-4">
        <span class="text-sm font-semibold text-fg-default">这是 AI 项目</span>
      </label>
      <p class="mt-1 text-xs text-fg-subtle">
        勾选后需要填写使用的模型与使用方式，项目会带上 AI 标记并进入 AI 专区。
      </p>

      <div v-if="form.isAi" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="使用的模型" hint="多个模型用逗号分隔，例如 deepseek-chat, gpt-4o-mini">
          <input
            v-model="form.aiModels"
            placeholder="deepseek-chat"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
        <FormField label="模型使用方式">
          <select
            v-model="form.aiHosting"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">请选择</option>
            <option v-for="option in hostingOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </FormField>
      </div>
    </section>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-fg-default">
        成本与收益
        <span class="ml-1 text-xs font-normal text-fg-subtle">全部选填，所有项目都可以填</span>
      </h2>
      <p class="mt-1 text-xs text-fg-subtle">
        填了之后会出现在卡片、详情页和排行榜里，页面会标注「数据由作者提供」。真实的数据对别人最有参考价值。
      </p>

      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="每月成本（元）">
          <input
            v-model="form.cost"
            type="number"
            min="0"
            placeholder="例如 260"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
        <FormField label="每月收入（元）">
          <input
            v-model="form.revenue"
            type="number"
            min="0"
            placeholder="未盈利填 0"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
        <FormField label="总收入（元）">
          <input
            v-model="form.total"
            type="number"
            min="0"
            placeholder="累计收入"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
      </div>

      <div class="mt-4 space-y-4">
        <FormField label="商业模式">
          <select
            v-model="form.revenueModel"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none sm:w-64"
          >
            <option value="">不填</option>
            <option v-for="option in revenueModelOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </FormField>

        <FormField label="成本说明" hint="例如：按 token 计费，平均每月 420 元">
          <input
            v-model="form.costNote"
            maxlength="200"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>

        <FormField label="收益说明" hint="例如：订阅制，目前 120 位付费用户">
          <input
            v-model="form.revenueNote"
            maxlength="200"
            class="h-8 w-full card px-3 text-sm focus:border-accent focus:outline-none"
          >
        </FormField>
      </div>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        :disabled="busy"
        class="h-9 rounded-md border border-accent bg-accent px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {{ busy ? '提交中…' : submitLabel }}
      </button>
      <button
        type="button"
        :disabled="busy"
        class="h-9 card px-4 text-sm hover:border-accent hover:text-accent disabled:opacity-60"
        @click="submit('draft')"
      >
        存为草稿
      </button>
      <span class="text-xs text-fg-subtle">
        提交后需要审核（AI 审核将在 D5 接入），你也可以先存草稿。
      </span>
    </div>
  </form>
</template>
