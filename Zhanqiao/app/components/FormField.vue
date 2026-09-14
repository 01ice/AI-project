<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  forId?: string
}>()
</script>

<template>
  <label class="block">
    <span class="mb-1 block text-sm font-medium text-fg-default">{{ label }}</span>
    <slot />
    <span v-if="hint" class="mt-1 block text-xs text-fg-subtle">{{ hint }}</span>
  </label>
</template>
