import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { dashConfig } from './config'

const COOKIE = 'dash_session'

/** brute-force brake: per-IP, in memory, resets on restart */
const attempts = new Map<string, { count: number; until: number }>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

export function dashEnabled(): boolean {
  return !!dashConfig().password
}

/**
 * Signing key. Deriving it from the password by default means one less variable
 * to set — and changing the password invalidates every open session, which is
 * the behaviour you want anyway.
 */
function sessionKey(): string {
  const { password, sessionSecret } = dashConfig()
  if (sessionSecret) return sessionSecret
  return createHash('sha256').update(`${password}:dash-session`).digest('hex')
}

function sign(payload: string): string {
  return createHmac('sha256', sessionKey()).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function clientIp(event: H3Event): string {
  return (
    getRequestHeader(event, 'cf-connecting-ip')
    ?? getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    ?? event.node.req.socket.remoteAddress
    ?? 'unknown'
  )
}

function isHttps(event: H3Event): boolean {
  return getRequestHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim() === 'https'
}

export function assertNotRateLimited(event: H3Event): void {
  const ip = clientIp(event)
  const entry = attempts.get(ip)
  if (entry && entry.count >= MAX_ATTEMPTS && Date.now() < entry.until) {
    const seconds = Math.ceil((entry.until - Date.now()) / 1000)
    throw createError({
      statusCode: 429,
      message: `too many attempts, wait ${seconds}s`,
    })
  }
}

export function recordFailure(event: H3Event): void {
  const ip = clientIp(event)
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now >= entry.until) attempts.set(ip, { count: 1, until: now + WINDOW_MS })
  else entry.count++
}

export function clearFailures(event: H3Event): void {
  attempts.delete(clientIp(event))
}

/** compare hashes, so the timing does not leak the password's length */
export function passwordMatches(candidate: string): boolean {
  const { password } = dashConfig()
  if (!password) return false
  const a = createHash('sha256').update(candidate).digest('hex')
  const b = createHash('sha256').update(password).digest('hex')
  return safeEqual(a, b)
}

export function issueSession(event: H3Event): void {
  const hours = dashConfig().sessionHours
  const expires = Date.now() + hours * 3600 * 1000
  const payload = String(expires)

  setCookie(event, COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(event),
    path: '/',
    maxAge: hours * 3600,
  })
}

export function clearDashSession(event: H3Event): void {
  deleteCookie(event, COOKIE, { path: '/' })
}

export function hasValidSession(event: H3Event): boolean {
  if (!dashEnabled()) return false

  const raw = getCookie(event, COOKIE)
  if (!raw) return false

  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(sign(payload), signature)) return false

  const expires = Number(payload)
  return Number.isFinite(expires) && Date.now() < expires
}

export function assertDashSession(event: H3Event): void {
  if (!dashEnabled()) {
    throw createError({ statusCode: 503, message: 'DASH_PASSWORD is not configured' })
  }
  if (!hasValidSession(event)) {
    throw createError({ statusCode: 401, message: 'not signed in' })
  }
}
