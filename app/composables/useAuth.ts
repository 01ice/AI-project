import type { SessionUser } from '~~/shared/types'

/** 全站共享的登录态，由 app.vue 在首次渲染时填充，登录/退出后手动更新 */
export function useAuthUser() {
  return useState<SessionUser | null>('auth:user', () => null)
}

/** 从接口错误里取出可读的中文提示 */
export function authErrorMessage(error: unknown): string {
  const err = error as { data?: { statusMessage?: string }, statusMessage?: string }
  return err?.data?.statusMessage || err?.statusMessage || '操作失败，请稍后再试'
}
