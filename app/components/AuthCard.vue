<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-[420px] py-10">
    <header class="text-center">
      <h1 class="text-xl font-semibold text-fg-default">{{ title }}</h1>
      <p v-if="description" class="mt-2 text-sm text-fg-muted">{{ description }}</p>
    </header>

    <div class="mt-5 rounded-md border border-border-default bg-canvas p-5">
      <slot />
    </div>

    <div class="mt-4 text-center text-xs text-fg-muted">
      <slot name="footer" />
    </div>
  </div>
</template>
