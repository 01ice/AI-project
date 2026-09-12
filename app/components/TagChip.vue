<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  to?: string
  active?: boolean
}>(), {
  to: '',
  active: false,
})
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors"
    :class="active
      ? 'border-accent bg-accent-subtle text-accent'
      : 'border-border-default bg-canvas-subtle text-fg-muted hover:border-accent hover:text-accent'"
  >
    {{ label }}
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-center rounded-full border border-border-default bg-canvas-subtle px-2.5 py-0.5 text-xs text-fg-muted"
  >
    {{ label }}
  </span>
</template>
