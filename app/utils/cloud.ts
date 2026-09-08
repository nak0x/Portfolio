import type { EffectConfig } from '#shared/effect'

/**
 * Turning the source image into points. Pure functions, no three.js here, so
 * the dash can show a mask preview with the same sampling the page uses.
 */

export interface Mask {
  width: number
  height: number
  /** luminance per cell, 0 = black, 255 = white */
  lum: Uint8Array
}

/** deterministic, so tweaking a slider does not reshuffle every point */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** a ridge line, for when nothing has been uploaded yet */
export function ridgeMask(columns: number): Mask {
  const width = Math.max(8, Math.round(columns))
  const height = Math.max(4, Math.round(width * 0.48))
  const lum = new Uint8Array(width * height).fill(255)
  const rand = mulberry32(7)
  // a few octaves of sines is enough to look like a skyline
  const phase = [rand() * 6, rand() * 6, rand() * 6, rand() * 6]

  for (let x = 0; x < width; x++) {
    const u = x / width
    const h =
      0.42 +
      0.2 * Math.sin(u * 5.1 + phase[0]!) +
      0.12 * Math.sin(u * 11.7 + phase[1]!) +
      0.06 * Math.sin(u * 23.3 + phase[2]!) +
      0.03 * Math.sin(u * 47.0 + phase[3]!)
    const ridge = Math.round(height * (1 - Math.min(0.92, Math.max(0.1, h))))
    for (let y = ridge; y < height; y++) {
      // darker towards the ridge, lighter (and eventually empty) at the base
      const t = (y - ridge) / Math.max(1, height - ridge)
      const grain = (rand() - 0.5) * 70
      lum[y * width + x] = Math.max(0, Math.min(255, Math.round(20 + t * 150 + grain)))
    }
  }
  return { width, height, lum }
}

/** sample an image on a `columns`-wide grid; rows follow the aspect ratio */
export function imageMask(img: HTMLImageElement, columns: number): Mask {
  const width = Math.max(8, Math.round(columns))
  const height = Math.max(4, Math.round((width * img.naturalHeight) / img.naturalWidth))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return ridgeMask(columns)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  const lum = new Uint8Array(width * height)
  for (let i = 0; i < lum.length; i++) {
    const r = data[i * 4]!, g = data[i * 4 + 1]!, b = data[i * 4 + 2]!, a = data[i * 4 + 3]! / 255
    // transparent counts as paper, not ink
    lum[i] = Math.round((0.299 * r + 0.587 * g + 0.114 * b) * a + 255 * (1 - a))
  }
  return { width, height, lum }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`could not load ${src.slice(0, 60)}`))
    img.src = src
  })
}

export interface CloudPoints {
  count: number
  position: Float32Array
  glyph: Float32Array
  seed: Float32Array
  lum: Float32Array
  /** world size the image spans */
  width: number
  height: number
}

/** the image plane is always this wide, in world units */
export const CLOUD_WIDTH = 10

export function buildPoints(mask: Mask, cfg: EffectConfig): CloudPoints {
  const glyphCount = Math.max(1, [...cfg.charset].length)
  const rand = mulberry32(1337)
  const cell = CLOUD_WIDTH / mask.width
  const width = CLOUD_WIDTH
  const height = mask.height * cell

  const pos: number[] = []
  const glyph: number[] = []
  const seed: number[] = []
  const lums: number[] = []

  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const l = mask.lum[y * mask.width + x]!
      // one draw per cell, whether or not it is used, keeps the pattern stable
      const keep = rand()
      const jx = rand() - 0.5
      const jy = rand() - 0.5
      const jz = rand() - 0.5
      const s = rand()
      const g = rand()
      if (l >= cfg.threshold || keep > cfg.density) continue

      const dark = 1 - l / 255
      const px = (x + 0.5 + jx * cfg.jitter) * cell - width / 2
      const py = height / 2 - (y + 0.5 + jy * cfg.jitter) * cell
      // random spread, pulled forward for darker cells
      const pz = (jz * (1 - cfg.depthFromLuminance) + (dark - 0.5) * cfg.depthFromLuminance) * cfg.depth

      let gi: number
      if (cfg.glyphMode === 'luminance') gi = Math.floor(dark * glyphCount)
      else if (cfg.glyphMode === 'depth') gi = Math.floor((pz / Math.max(cfg.depth, 1e-6) + 0.5) * glyphCount)
      else gi = Math.floor(g * glyphCount)

      pos.push(px, py, pz)
      glyph.push(Math.min(glyphCount - 1, Math.max(0, gi)))
      seed.push(s)
      lums.push(dark)
    }
  }

  return {
    count: glyph.length,
    position: Float32Array.from(pos),
    glyph: Float32Array.from(glyph),
    seed: Float32Array.from(seed),
    lum: Float32Array.from(lums),
    width,
    height,
  }
}

/** parse `#rgb`/`#rrggbb` into 0..1 components, no colour management */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = Number.parseInt(h.slice(0, 6), 16)
  if (!Number.isFinite(n)) return [1, 1, 1]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** shrink + greyscale an uploaded file into a compact png data url */
export async function prepareUpload(file: File, maxWidth = 480): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxWidth / img.naturalWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = image.data
    for (let i = 0; i < d.length; i += 4) {
      const l = Math.round(0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!)
      d[i] = d[i + 1] = d[i + 2] = l
      d[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
