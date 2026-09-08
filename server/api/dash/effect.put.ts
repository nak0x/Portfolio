import { assertDashSession } from '~~/server/utils/dash-auth'
import { putEffectConfig } from '~~/server/utils/effect'
import { EFFECT_IMAGE_MAX_BYTES, type EffectConfig } from '#shared/effect'

export default defineEventHandler(async (event) => {
  assertDashSession(event)

  const { data, revision, message } = await readBody<{
    data: EffectConfig
    revision?: number | null
    message?: string
  }>(event)

  if (!data || typeof data !== 'object') {
    throw createError({ statusCode: 422, message: 'missing effect config' })
  }
  if (revision != null && !Number.isInteger(revision)) {
    throw createError({ statusCode: 422, message: 'revision must be an integer' })
  }
  if (typeof data.image === 'string' && data.image.length > EFFECT_IMAGE_MAX_BYTES) {
    throw createError({
      statusCode: 413,
      message: `image too large (${Math.round(data.image.length / 1024)}KB) — the dash should have downscaled it`,
    })
  }

  return putEffectConfig(data, { revision, message: message?.trim() || 'update effect' })
})
