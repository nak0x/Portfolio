import { createHmac, timingSafeEqual } from 'node:crypto'
import { bustCache } from '~~/server/utils/cache'
import { getIndex } from '~~/server/utils/posts'

/**
 * Push webhook for the content repo.
 *
 * Gitea  : Settings -> Webhooks -> Gitea, url = https://nak0x.dev/api/webhook/content,
 *          method POST, content type application/json, secret = CONTENT_WEBHOOK_SECRET.
 *          It signs the body into `X-Gitea-Signature` (hex hmac-sha256).
 * GitHub : same idea, header is `X-Hub-Signature-256` and looks like `sha256=<hex>`.
 *
 * A valid call drops the cache and immediately warms the index back up, so the
 * first visitor after a push does not pay for the refetch.
 */
export default defineEventHandler(async (event) => {
  const secret = contentConfig().webhookSecret

  if (!secret) {
    throw createError({
      statusCode: 503,
      message: 'CONTENT_WEBHOOK_SECRET is not configured',
    })
  }

  const raw = await readRawBody(event, false)
  if (!raw) throw createError({ statusCode: 400, message: 'empty body' })

  const body = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw))
  const digest = createHmac('sha256', secret).update(body).digest('hex')

  const provided =
    getHeader(event, 'x-gitea-signature')
    ?? getHeader(event, 'x-hub-signature-256')?.replace(/^sha256=/, '')
    ?? ''

  if (!safeEqual(digest, provided)) {
    throw createError({ statusCode: 401, message: 'bad signature' })
  }

  const cleared = bustCache('posts:')

  // warm the index again; failures here are not the webhook's problem
  getIndex().catch((error) => console.error('[webhook] re-warm failed:', error))

  const eventName =
    getHeader(event, 'x-gitea-event') ?? getHeader(event, 'x-github-event') ?? 'unknown'
  console.info(`[webhook] ${eventName}: cleared ${cleared} cache entries`)

  return { ok: true, event: eventName, cleared }
})

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
