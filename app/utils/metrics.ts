import type { AiHosting, ProjectMetrics, RevenueModel } from '~~/shared/types'

export const aiHostingLabels: Record<AiHosting, string> = {
  api: '调用 API',
  self_hosted: '本地部署',
  hybrid: '混合',
}

export const revenueModelLabels: Record<RevenueModel, string> = {
  free: '免费',
  freemium: '免费 + 付费',
  subscription: '订阅制',
  one_time: '一次性买断',
  ads: '广告',
  service: '接单服务',
  not_yet: '还没有收入',
}

export function formatCny(value: number | null | undefined): string {
  if (value === null || value === undefined) return '未公开'
  return `¥${value.toLocaleString('zh-CN')}`
}

/** 是否填写了成本或收益数据 */
export function hasMoneyData(metrics: ProjectMetrics): boolean {
  return metrics.monthlyCostCny !== null || metrics.monthlyRevenueCny !== null
}

export type ProfitState = 'profit' | 'breakeven' | 'loss' | 'free' | 'unknown'

/** 根据每月成本与收益推导盈利状态 */
export function profitState(metrics: ProjectMetrics): ProfitState {
  const cost = metrics.monthlyCostCny
  const revenue = metrics.monthlyRevenueCny

  if (revenue === null) return 'unknown'
  if (revenue === 0) return (cost ?? 0) > 0 ? 'loss' : 'free'
  if (cost === null) return 'unknown'
  if (revenue > cost) return 'profit'
  if (revenue === cost) return 'breakeven'
  return 'loss'
}

export function profitLabel(state: ProfitState): string {
  switch (state) {
    case 'profit': return '已盈利'
    case 'breakeven': return '收支平衡'
    case 'loss': return '未回本'
    case 'free': return '零成本'
    default: return '数据未公开'
  }
}

export function profitClass(state: ProfitState): string {
  switch (state) {
    case 'profit': return 'text-success'
    case 'breakeven': return 'text-fg-muted'
    case 'loss': return 'text-attention'
    default: return 'text-fg-subtle'
  }
}

/** 每月净利：收入减去成本 */
export function monthlyProfit(metrics: ProjectMetrics): number | null {
  if (metrics.monthlyRevenueCny === null) return null
  return metrics.monthlyRevenueCny - (metrics.monthlyCostCny ?? 0)
}
