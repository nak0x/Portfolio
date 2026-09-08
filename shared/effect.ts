/**
 * The ascii point cloud on the home page: a mountain image, sampled on a
 * grid, every dark cell becomes a glyph floating in 3D. This is everything
 * that can be tuned about it. The values here are the seed the first
 * migration stores; after that the database wins and /dash/effect edits it.
 */

export type GlyphMode = 'random' | 'depth' | 'luminance'
export type Placement = 'background' | 'block'
export type Fit = 'cover' | 'contain'

export interface EffectConfig {
  enabled: boolean
  /** a fixed layer behind the whole page, or a framed block under the banner */
  placement: Placement
  /** frame tag shown on the block, e.g. `/summit` (block only) */
  label: string
  /** block height in px (block only) */
  height: number
  /** how the image plane fills the canvas — like css object-fit */
  fit: Fit
  /** multiplier on top of the fit; 1 = exact cover/contain */
  zoom: number
  /** -1..1 — pan the plane, in halves of the visible area */
  offsetX: number
  offsetY: number

  // --- source image → points -------------------------------------------
  /** data url (in the database) or a url (over the api); null = procedural ridge */
  image: string | null
  /** 0..255 — a cell whose luminance is below this becomes a point */
  threshold: number
  /** sampling grid width; rows follow the image aspect */
  columns: number
  /** 0..1 — share of eligible cells that actually get a point */
  density: number
  /** 0..1 — random offset inside the cell, in cell units */
  jitter: number
  /** z spread, in world units (the image is 10 units wide) */
  depth: number
  /** 0..1 — how much darker cells come towards the camera */
  depthFromLuminance: number

  // --- glyphs -------------------------------------------------------------
  charset: string
  glyphMode: GlyphMode
  /** glyph size in px at the image plane */
  size: number
  /** 0..1 — random size variation */
  sizeVariance: number
  color: string
  /** 0..1 */
  opacity: number
  /** 0..1 — points further back fade out */
  depthFade: number
  /** 'transparent' or a css colour */
  background: string

  // --- idle motion (simplex noise, w = noiseSpeed * seconds) ---------------
  noiseScale: number
  noiseAmplitude: number
  noiseSpeed: number

  // --- cursor: a soft repulsive field, made irregular by cursor speed ------
  /** world units */
  mouseRadius: number
  /** world units of push at the centre */
  mouseStrength: number
  /** falloff exponent: 1 = wide gaussian tails, 4 = tighter disc */
  mouseSoftness: number
  /** overall amount of distortion applied to the repulsive field */
  turbulence: number
  /** 0..1 — share of it that is always on, with no cursor movement at all */
  turbulenceBase: number
  /** spatial frequency of that distortion */
  turbulenceScale: number
  /** the distortion's own drift: w = turbulenceSpeed * seconds */
  turbulenceSpeed: number
  /** 0..1 — how much the cursor velocity is smoothed over time */
  velocitySmoothing: number
  /** 0..1 — how quickly the field follows the cursor (1 = instantly) */
  mouseEase: number

  // --- camera ----------------------------------------------------------------
  fov: number
  cameraDistance: number
  /** degrees */
  tiltX: number
  tiltY: number
  /** degrees per second */
  autoRotate: number
  /** 0..1 — camera drifts with the cursor */
  parallax: number
}

export const GLYPH_MODES: GlyphMode[] = ['random', 'depth', 'luminance']
export const PLACEMENTS: Placement[] = ['background', 'block']
export const FITS: Fit[] = ['cover', 'contain']

export const defaultEffectConfig: EffectConfig = {
  enabled: true,
  placement: 'background',
  label: '/summit',
  height: 360,
  fit: 'cover',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,

  image: null,
  threshold: 128,
  columns: 140,
  density: 0.85,
  jitter: 0.6,
  depth: 2.5,
  depthFromLuminance: 0.5,

  charset: '.:-=+*#%@',
  glyphMode: 'luminance',
  size: 11,
  sizeVariance: 0.25,
  color: '#D97629',
  opacity: 0.9,
  depthFade: 0.6,
  background: 'transparent',

  noiseScale: 0.6,
  noiseAmplitude: 0.18,
  noiseSpeed: 0.03,

  mouseRadius: 1.6,
  mouseStrength: 0.9,
  mouseSoftness: 2,
  turbulence: 1.2,
  turbulenceBase: 0.55,
  turbulenceScale: 1.5,
  turbulenceSpeed: 0.25,
  velocitySmoothing: 0.85,
  mouseEase: 0.12,

  fov: 40,
  cameraDistance: 9,
  tiltX: 8,
  tiltY: 0,
  autoRotate: 0,
  parallax: 0.25,
}

/** every numeric field, with the range the dash sliders use */
export const EFFECT_RANGES = {
  height: { min: 120, max: 900, step: 10 },
  zoom: { min: 0.25, max: 4, step: 0.01 },
  offsetX: { min: -1, max: 1, step: 0.01 },
  offsetY: { min: -1, max: 1, step: 0.01 },
  threshold: { min: 0, max: 255, step: 1 },
  columns: { min: 20, max: 320, step: 2 },
  density: { min: 0, max: 1, step: 0.01 },
  jitter: { min: 0, max: 1, step: 0.01 },
  depth: { min: 0, max: 6, step: 0.05 },
  depthFromLuminance: { min: 0, max: 1, step: 0.01 },
  size: { min: 2, max: 48, step: 0.5 },
  sizeVariance: { min: 0, max: 1, step: 0.01 },
  opacity: { min: 0, max: 1, step: 0.01 },
  depthFade: { min: 0, max: 1, step: 0.01 },
  noiseScale: { min: 0.05, max: 5, step: 0.05 },
  noiseAmplitude: { min: 0, max: 2, step: 0.01 },
  noiseSpeed: { min: 0, max: 1, step: 0.005 },
  mouseRadius: { min: 0.1, max: 6, step: 0.05 },
  mouseStrength: { min: 0, max: 4, step: 0.05 },
  mouseSoftness: { min: 0.5, max: 6, step: 0.1 },
  turbulence: { min: 0, max: 5, step: 0.05 },
  turbulenceBase: { min: 0, max: 1, step: 0.01 },
  turbulenceScale: { min: 0.1, max: 6, step: 0.05 },
  turbulenceSpeed: { min: 0, max: 2, step: 0.01 },
  velocitySmoothing: { min: 0, max: 0.99, step: 0.01 },
  mouseEase: { min: 0.01, max: 1, step: 0.01 },
  fov: { min: 15, max: 110, step: 1 },
  cameraDistance: { min: 2, max: 25, step: 0.1 },
  tiltX: { min: -80, max: 80, step: 1 },
  tiltY: { min: -80, max: 80, step: 1 },
  autoRotate: { min: -45, max: 45, step: 0.5 },
  parallax: { min: 0, max: 1, step: 0.01 },
} as const satisfies Record<string, { min: number; max: number; step: number }>

export type EffectNumberKey = keyof typeof EFFECT_RANGES

/** rough cap for the stored image (a data url); the dash downscales before upload */
export const EFFECT_IMAGE_MAX_BYTES = 1_500_000

// --- normalisation ---------------------------------------------------------

const num = (v: unknown, key: EffectNumberKey, fallback: number): number => {
  const { min, max } = EFFECT_RANGES[key]
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

const isColor = (v: unknown): v is string =>
  typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim())

const isImage = (v: unknown): v is string =>
  typeof v === 'string' &&
  v.length <= EFFECT_IMAGE_MAX_BYTES &&
  (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(v) || /^\/api\/effect\/image(\?|$)/.test(v))

export function normalizeEffectConfig(input: unknown): EffectConfig {
  const d = defaultEffectConfig
  if (!input || typeof input !== 'object') return structuredClone(d)
  const raw = input as Record<string, unknown>

  const charset =
    typeof raw.charset === 'string' && [...raw.charset].length ? [...raw.charset].slice(0, 64).join('') : d.charset

  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 40) : d.label
  const background =
    raw.background === 'transparent' || isColor(raw.background) ? (raw.background as string) : d.background

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    placement: PLACEMENTS.includes(raw.placement as Placement) ? (raw.placement as Placement) : d.placement,
    label: label || d.label,
    height: num(raw.height, 'height', d.height),
    fit: FITS.includes(raw.fit as Fit) ? (raw.fit as Fit) : d.fit,
    zoom: num(raw.zoom, 'zoom', d.zoom),
    offsetX: num(raw.offsetX, 'offsetX', d.offsetX),
    offsetY: num(raw.offsetY, 'offsetY', d.offsetY),

    image: isImage(raw.image) ? raw.image : null,
    threshold: num(raw.threshold, 'threshold', d.threshold),
    columns: Math.round(num(raw.columns, 'columns', d.columns)),
    density: num(raw.density, 'density', d.density),
    jitter: num(raw.jitter, 'jitter', d.jitter),
    depth: num(raw.depth, 'depth', d.depth),
    depthFromLuminance: num(raw.depthFromLuminance, 'depthFromLuminance', d.depthFromLuminance),

    charset,
    glyphMode: GLYPH_MODES.includes(raw.glyphMode as GlyphMode) ? (raw.glyphMode as GlyphMode) : d.glyphMode,
    size: num(raw.size, 'size', d.size),
    sizeVariance: num(raw.sizeVariance, 'sizeVariance', d.sizeVariance),
    color: isColor(raw.color) ? raw.color.trim() : d.color,
    opacity: num(raw.opacity, 'opacity', d.opacity),
    depthFade: num(raw.depthFade, 'depthFade', d.depthFade),
    background,

    noiseScale: num(raw.noiseScale, 'noiseScale', d.noiseScale),
    noiseAmplitude: num(raw.noiseAmplitude, 'noiseAmplitude', d.noiseAmplitude),
    noiseSpeed: num(raw.noiseSpeed, 'noiseSpeed', d.noiseSpeed),

    mouseRadius: num(raw.mouseRadius, 'mouseRadius', d.mouseRadius),
    mouseStrength: num(raw.mouseStrength, 'mouseStrength', d.mouseStrength),
    mouseSoftness: num(raw.mouseSoftness, 'mouseSoftness', d.mouseSoftness),
    turbulence: num(raw.turbulence, 'turbulence', d.turbulence),
    turbulenceBase: num(raw.turbulenceBase, 'turbulenceBase', d.turbulenceBase),
    turbulenceScale: num(raw.turbulenceScale, 'turbulenceScale', d.turbulenceScale),
    turbulenceSpeed: num(raw.turbulenceSpeed, 'turbulenceSpeed', d.turbulenceSpeed),
    velocitySmoothing: num(raw.velocitySmoothing, 'velocitySmoothing', d.velocitySmoothing),
    mouseEase: num(raw.mouseEase, 'mouseEase', d.mouseEase),

    fov: num(raw.fov, 'fov', d.fov),
    cameraDistance: num(raw.cameraDistance, 'cameraDistance', d.cameraDistance),
    tiltX: num(raw.tiltX, 'tiltX', d.tiltX),
    tiltY: num(raw.tiltY, 'tiltY', d.tiltY),
    autoRotate: num(raw.autoRotate, 'autoRotate', d.autoRotate),
    parallax: num(raw.parallax, 'parallax', d.parallax),
  }
}
