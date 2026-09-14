<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  hint?: string
  aspect?: string
}>(), {
  label: '上传图片',
  hint: '支持 JPG / PNG / WebP / GIF，单张不超过 5MB；也可以把图片拖进来',
  aspect: 'aspect-video',
})

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)
const error = ref('')

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  await upload(file)
  input.value = ''
}

async function upload(file: File) {
  uploading.value = true
  error.value = ''

  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ url: string }>('/api/upload', { method: 'POST', body: form })
    emit('update:modelValue', res.url)
  }
  catch (err) {
    error.value = authErrorMessage(err)
  }
  finally {
    uploading.value = false
  }
}

/** 支持把图片直接拖进上传区域 */
async function onDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  event.preventDefault()
  await upload(file)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div>
    <div
      class="relative flex items-center justify-center overflow-hidden rounded-md border border-dashed border-border-default bg-canvas-subtle"
      :class="aspect"
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <img v-if="modelValue" :src="modelValue" alt="" class="h-full w-full object-cover">
      <div v-else class="px-4 py-6 text-center text-xs text-fg-muted">
        <p>{{ uploading ? '正在上传…' : label }}</p>
        <p class="mt-1 text-fg-subtle">{{ hint }}</p>
      </div>

      <label
        class="absolute inset-0 cursor-pointer"
        :title="modelValue ? '重新选择图片' : label"
      >
        <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onFile">
      </label>
    </div>

    <div class="mt-1 flex items-center gap-3 text-xs">
      <span v-if="error" class="text-danger">{{ error }}</span>
      <button v-if="modelValue" type="button" class="text-fg-muted hover:text-danger" @click="clear">
        移除
      </button>
    </div>
  </div>
</template>
