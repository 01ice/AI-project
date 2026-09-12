<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  username?: string
  size?: number
  imageUrl?: string | null
}>(), {
  size: 20,
  username: '',
  imageUrl: null,
})

const hue = computed(() => avatarHue(props.username || props.name))
const initial = computed(() => (props.name || '?').trim().charAt(0))
</script>

<template>
  <img
    v-if="imageUrl"
    :src="imageUrl"
    :alt="name"
    :width="size"
    :height="size"
    class="rounded-full border border-border-default object-cover"
  >
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.55)}px`,
      backgroundColor: `hsl(${hue} 48% 48%)`,
    }"
  >{{ initial }}</span>
</template>
