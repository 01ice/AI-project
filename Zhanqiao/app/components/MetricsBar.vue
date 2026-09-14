<script setup lang="ts">
import type { ProjectMetrics } from '~~/shared/types'

const props = withDefaults(defineProps<{
  metrics: ProjectMetrics
  maxModels?: number
}>(), {
  maxModels: 2,
})

const hasMoney = computed(() => hasMoneyData(props.metrics))
const visible = computed(() => props.metrics.isAi || hasMoney.value)
const state = computed(() => profitState(props.metrics))
const visibleModels = computed(() => props.metrics.models.slice(0, props.maxModels))
const hiddenCount = computed(() => Math.max(0, props.metrics.models.length - props.maxModels))
</script>

<template>
  <div v-if="visible" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    <span v-if="metrics.isAi" class="rounded-full bg-accent-subtle px-2 py-0.5 font-medium text-accent">AI</span>

    <span
      v-for="model in visibleModels"
      :key="model"
      class="rounded-full border border-border-muted px-2 py-0.5 text-fg-muted"
    >
      {{ model }}
    </span>
    <span v-if="hiddenCount" class="text-fg-subtle">+{{ hiddenCount }}</span>

    <span v-if="metrics.monthlyCostCny !== null" class="text-fg-muted">
      月成本
      <span class="font-medium text-fg-default">{{ formatCny(metrics.monthlyCostCny) }}</span>
    </span>
    <span v-if="metrics.monthlyRevenueCny !== null" class="text-fg-muted">
      月收入
      <span class="font-medium text-fg-default">{{ formatCny(metrics.monthlyRevenueCny) }}</span>
    </span>
    <span v-if="hasMoney" :class="profitClass(state)">{{ profitLabel(state) }}</span>
  </div>
</template>
