<script setup lang="ts">
import type { AiInfo } from '~~/shared/types'

const props = withDefaults(defineProps<{
  ai: AiInfo
  maxModels?: number
}>(), {
  maxModels: 2,
})

const state = computed(() => profitState(props.ai))
const visibleModels = computed(() => props.ai.models.slice(0, props.maxModels))
const hiddenCount = computed(() => Math.max(0, props.ai.models.length - props.maxModels))
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    <span class="rounded-full bg-accent-subtle px-2 py-0.5 font-medium text-accent">AI</span>

    <span
      v-for="model in visibleModels"
      :key="model"
      class="rounded-full border border-border-muted px-2 py-0.5 text-fg-muted"
    >
      {{ model }}
    </span>
    <span v-if="hiddenCount" class="text-fg-subtle">+{{ hiddenCount }}</span>

    <span class="text-fg-muted">
      月成本
      <span class="font-medium text-fg-default">{{ formatCny(ai.monthlyCostCny) }}</span>
    </span>
    <span class="text-fg-muted">
      月收入
      <span class="font-medium text-fg-default">{{ formatCny(ai.monthlyRevenueCny) }}</span>
    </span>
    <span :class="profitClass(state)">{{ profitLabel(state) }}</span>
  </div>
</template>
