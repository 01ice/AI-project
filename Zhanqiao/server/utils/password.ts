import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

// scrypt 参数：内存开销约 32MB，单次校验几十毫秒，能有效抵抗离线爆破
const PARAMS = { N: 32768, r: 8, p: 1, keylen: 64 }
const SALT_BYTES = 16

/**
 * 使用 Node 内置的 scrypt 做密码哈希。
 * 选它而不是 argon2 的原因是零原生依赖：Windows 开发机、CentOS 7、Alpine 容器上
 * 都不会遇到编译或预编译二进制不兼容的问题。格式：scrypt$N$r$p$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = (await scrypt(password.normalize('NFKC'), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 128 * 1024 * 1024,
  })) as Buffer

  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, n, r, p, saltB64, hashB64] = parts
  const salt = Buffer.from(saltB64!, 'base64')
  const expected = Buffer.from(hashB64!, 'base64')

  try {
    const derived = (await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * 1024 * 1024,
    })) as Buffer

    return derived.length === expected.length && timingSafeEqual(derived, expected)
  }
  catch {
    return false
  }
}

/** 生成用于邮箱验证、密码重置、会话的随机串 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}
