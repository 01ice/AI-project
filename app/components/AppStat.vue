<script setup lang="ts">
withDefaults(defineProps<{
  icon: 'heart' | 'star' | 'eye' | 'comment'
  value: number
  label?: string
}>(), {
  label: '',
})

const paths: Record<string, string> = {
  heart: 'M8 14.25 2.5 8.9A3.6 3.6 0 0 1 8 4.2a3.6 3.6 0 0 1 5.5 4.7L8 14.25Z',
  star: 'M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.5 4.2 13.5l.7-4.2-3.1-3 4.3-.6L8 1.8Z',
  eye: 'M1.5 8S3.9 3.8 8 3.8 14.5 8 14.5 8 12.1 12.2 8 12.2 1.5 8 1.5 8Zm6.5 1.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z',
  comment: 'M2 3.5h12v7.2H6.6L3.4 13.4V10.7H2V3.5Z',
}
</script>

<template>
  <span class="inline-flex items-center gap-1 text-fg-muted" :title="label">
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      :fill="icon === 'star' || icon === 'comment' ? 'currentColor' : 'none'"
      :stroke="icon === 'heart' || icon === 'eye' ? 'currentColor' : 'none'"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path :d="paths[icon]" />
    </svg>
    <span>{{ formatCount(value) }}</span>
  </span>
</template>
