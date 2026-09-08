import { normalizeEffectConfig, type EffectConfig } from '#shared/effect'
import type { Revision } from './revisions'
import { insertRevision, latestRevision } from './revisions'

/**
 * The home-page effect config, one row per revision (migration
 * `002-effect-config`). The image is stored inside the JSON as a data url;
 * the public api swaps it for a url so the page payload stays small.
 */

export type EffectDocument = Revision<EffectConfig>

export function getEffectDocument(): EffectDocument {
  return latestRevision('effect_config', normalizeEffectConfig)
}

/** what the home page gets: the image replaced by a cacheable url */
export function getPublicEffectConfig(): EffectConfig {
  const { data, revision } = getEffectDocument()
  return { ...data, image: data.image ? `/api/effect/image?v=${revision}` : null }
}

export function putEffectConfig(
  input: unknown,
  options: { message: string; revision?: number | null },
): EffectDocument {
  const data = normalizeEffectConfig(input)

  // the dash may send back the url it was given instead of the data url;
  // that means "keep the image i already have"
  if (data.image && data.image.startsWith('/api/effect/image')) {
    data.image = getEffectDocument().data.image
  }

  return insertRevision('effect_config', data, normalizeEffectConfig, options)
}

/** decode the stored data url into bytes + mime, or null when there is none */
export function getEffectImage(): { mime: string; bytes: Buffer } | null {
  const image = getEffectDocument().data.image
  if (!image || !image.startsWith('data:')) return null
  const match = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(image)
  if (!match) return null
  return { mime: match[1] as string, bytes: Buffer.from(match[2] as string, 'base64') }
}
