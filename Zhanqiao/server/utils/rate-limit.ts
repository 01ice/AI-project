interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * 极简内存限流。单机部署够用；将来多实例部署时应换成 Redis。
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count += 1
  if (bucket.count > limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: `操作太频繁，请 ${seconds} 秒后再试`,
    })
  }
}

/**
 * 取客户端 IP 用于限流。
 * X-Forwarded-For 是客户端可以伪造的头部，只有在「应用不直接对外、由反向代理转发」时才可信，
 * 因此默认不信任；部署 Caddy/Nginx 反代后通过 NUXT_TRUST_PROXY=1 打开。
 */
export function clientIp(event: Parameters<typeof getRequestIP>[0]): string {
  const trustProxy = process.env.NUXT_TRUST_PROXY === '1'
  return getRequestIP(event, { xForwardedFor: trustProxy }) ?? 'unknown'
}
