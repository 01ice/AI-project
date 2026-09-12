export function formatDate(input: string | null | undefined): string {
  if (!input) return '—'
  const date = new Date(input)
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function formatCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

/** 用用户名推导头像色相，保证同一用户颜色稳定 */
export function avatarHue(seed: string): number {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360
  }
  return hash
}

export function relativeTime(input: string | null | undefined): string {
  if (!input) return ''
  const diff = Date.now() - new Date(input).getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatDate(input)
}
