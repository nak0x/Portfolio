<script setup lang="ts">
import * as THREE from 'three'
import type { EffectConfig } from '#shared/effect'
import { buildPoints, hexToRgb, imageMask, loadImage, ridgeMask, type Mask } from '~/utils/cloud'

/**
 * The mountain, as a cloud of ascii glyphs.
 *
 * Every dark cell of the source image is one point. The GPU does the rest:
 * a simplex-noise drift (w = noiseSpeed × seconds), and a soft repulsive
 * field around the cursor whose shape is always bent by noise — the shape
 * drifts on its own clock — and gets rougher the faster the cursor moves. The glyphs come from a canvas-drawn atlas that
 * a point sprite samples by index.
 *
 * The image plane is fitted to the canvas like css object-fit: the frustum's
 * visible width and height at the plane are compared with the plane's, and
 * the group is scaled by the larger ratio (cover) or the smaller (contain).
 *
 * Always mount this inside <ClientOnly>: it needs a window, and the `.client`
 * suffix would break the template ref it hangs the canvas on.
 */

const props = defineProps<{ config: EffectConfig }>()
const host = ref<HTMLElement | null>(null)

const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

const VERTEX = /* glsl */ `
${NOISE}
attribute float aGlyph;
attribute float aSeed;
attribute float aLum;

uniform float uTime;
uniform float uNoiseW;
uniform float uNoiseScale;
uniform float uNoiseAmp;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseSoftness;
uniform float uTurb;
uniform float uTurbScale;
uniform float uTurbW;
uniform float uSize;
uniform float uSizeVar;
uniform float uPixelRatio;
uniform float uCamDist;
uniform float uDepth;
uniform float uDepthFade;
uniform float uOpacity;

varying float vGlyph;
varying float vAlpha;

void main() {
  vec3 p = position;

  // idle drift: three decorrelated noise fields, w slides with time
  vec3 q = p * uNoiseScale;
  vec3 drift = vec3(
    snoise(vec3(q.xy, q.z + uNoiseW)),
    snoise(vec3(q.xy + 17.3, q.z + uNoiseW + 5.1)),
    snoise(vec3(q.xy + 41.7, q.z + uNoiseW + 9.7))
  );
  p += drift * uNoiseAmp;

  // cursor: a repulsive field that is never a clean disc. three noise fields,
  // all drifting on uTurbW, deform its edge, its push direction and its force.
  vec2 diff = p.xy - uMouse;
  float d = length(diff);
  float r = max(uMouseRadius, 0.0001);
  float n0 = snoise(vec3(p.xy * uTurbScale * 0.8, uTurbW));
  float n1 = snoise(vec3(p.xy * uTurbScale, uTurbW * 1.3 + aSeed * 0.5));
  float n2 = snoise(vec3(p.xy * uTurbScale + 50.0, uTurbW * 1.7 + 11.0));
  // the edge itself wobbles, so the hole is a blob rather than a circle
  float dWobbled = max(d * (1.0 + n0 * uTurb * 0.5), 0.0);
  float fall = exp(-pow(dWobbled / r, uMouseSoftness));
  vec2 dir = d > 0.0001 ? diff / d : vec2(0.0);
  float ang = n1 * uTurb * 1.8;
  float c = cos(ang), s = sin(ang);
  dir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
  float amount = uMouseStrength * fall * (1.0 + n2 * uTurb) * uMouseActive;
  p.xy += dir * amount;
  p.z += n2 * uTurb * amount * 0.6;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uSize * (1.0 + (aSeed - 0.5) * 2.0 * uSizeVar);
  gl_PointSize = max(1.0, size * uPixelRatio * uCamDist / max(0.01, -mv.z));

  // further back = fainter; measured on the undisturbed position
  float back = clamp(0.5 - position.z / max(uDepth, 0.001), 0.0, 1.0);
  vAlpha = uOpacity * (1.0 - uDepthFade * back * 0.85);
  vGlyph = aGlyph;
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uColor;
uniform float uAtlasCols;
uniform float uAtlasRows;

varying float vGlyph;
varying float vAlpha;

void main() {
  float col = mod(vGlyph, uAtlasCols);
  float row = floor(vGlyph / uAtlasCols);
  vec2 uv = (vec2(col, row) + gl_PointCoord) / vec2(uAtlasCols, uAtlasRows);
  float a = texture2D(uAtlas, uv).a * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(uColor, a);
}
`

// --- glyph atlas -----------------------------------------------------------

function makeAtlas(charset: string): { texture: THREE.Texture; cols: number; rows: number } {
  const chars = [...charset]
  const cell = 64
  const cols = Math.max(1, Math.ceil(Math.sqrt(chars.length)))
  const rows = Math.max(1, Math.ceil(chars.length / cols))
  const canvas = document.createElement('canvas')
  canvas.width = cols * cell
  canvas.height = rows * cell
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${Math.round(cell * 0.82)}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`
  chars.forEach((ch, i) => {
    ctx.fillText(ch, ((i % cols) + 0.5) * cell, (Math.floor(i / cols) + 0.5) * cell + cell * 0.04)
  })
  const texture = new THREE.CanvasTexture(canvas)
  // gl_PointCoord has y down, like the canvas: keep the texture the same way up
  texture.flipY = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { texture, cols, rows }
}

// --- scene -----------------------------------------------------------------

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let group: THREE.Group
let points: THREE.Points | null = null
let material: THREE.ShaderMaterial
let atlas: ReturnType<typeof makeAtlas> | null = null
let atlasCharset = ''
let mask: Mask | null = null
let maskKey = ''
let raf = 0
let visible = true
let reducedMotion = false
let lastFrame = 0
let elapsed = 0
let resizeObserver: ResizeObserver | null = null
let intersection: IntersectionObserver | null = null
let buildToken = 0
let cloudSize = { width: 10, height: 5 }

const raycaster = new THREE.Raycaster()
const plane = new THREE.Plane()
const hit = new THREE.Vector3()
const ndc = new THREE.Vector2(0, 0)
const pointer = { active: 0, targetActive: 0, x: 0, y: 0, tx: 0, ty: 0, lastX: 0, lastY: 0, lastAt: 0, speed: 0, turb: 0 }

const uniforms = {
  uTime: { value: 0 },
  uNoiseW: { value: 0 },
  uNoiseScale: { value: 1 },
  uNoiseAmp: { value: 0 },
  uMouse: { value: new THREE.Vector2(999, 999) },
  uMouseActive: { value: 0 },
  uMouseRadius: { value: 1 },
  uMouseStrength: { value: 0 },
  uMouseSoftness: { value: 2 },
  uTurb: { value: 0 },
  uTurbScale: { value: 1 },
  uTurbW: { value: 0 },
  uSize: { value: 10 },
  uSizeVar: { value: 0 },
  uPixelRatio: { value: 1 },
  uCamDist: { value: 9 },
  uDepth: { value: 1 },
  uDepthFade: { value: 0 },
  uOpacity: { value: 1 },
  uAtlas: { value: null as THREE.Texture | null },
  uAtlasCols: { value: 1 },
  uAtlasRows: { value: 1 },
  uColor: { value: new THREE.Vector3(1, 1, 1) },
}

function setup(el: HTMLElement) {
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
  } catch (error) {
    console.warn('[cloud] webgl unavailable:', error)
    renderer = null
    return
  }
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(props.config.fov, 1, 0.1, 100)
  group = new THREE.Group()
  scene.add(group)

  material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  })

  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(el)

  intersection = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    if (visible && !raf) loop(performance.now())
  })
  intersection.observe(el)

  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  // the page content sits on top of a background canvas, so listen on the
  // window and work out where the cursor is relative to the canvas ourselves
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerMove, { passive: true })
  document.addEventListener('pointerout', onPointerOut)
  window.addEventListener('blur', onPointerLeave)
}

function resize() {
  const el = host.value
  if (!el || !renderer) return
  const w = Math.max(1, el.clientWidth)
  const h = Math.max(1, el.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  uniforms.uPixelRatio.value = renderer.getPixelRatio()
  if (reducedMotion) render(0)
}

async function rebuild() {
  if (!renderer) return
  const cfg = props.config
  const token = ++buildToken

  const key = `${cfg.image ?? ''}|${cfg.columns}`
  if (key !== maskKey || !mask) {
    let next: Mask
    if (cfg.image) {
      try {
        next = imageMask(await loadImage(cfg.image), cfg.columns)
      } catch (error) {
        console.warn('[cloud] falling back to the ridge:', error)
        next = ridgeMask(cfg.columns)
      }
    } else {
      next = ridgeMask(cfg.columns)
    }
    if (token !== buildToken) return
    mask = next
    maskKey = key
  }

  if (cfg.charset !== atlasCharset || !atlas) {
    atlas?.texture.dispose()
    atlas = makeAtlas(cfg.charset)
    atlasCharset = cfg.charset
    uniforms.uAtlas.value = atlas.texture
    uniforms.uAtlasCols.value = atlas.cols
    uniforms.uAtlasRows.value = atlas.rows
  }

  const cloud = buildPoints(mask, cfg)
  cloudSize = { width: cloud.width, height: cloud.height }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(cloud.position, 3))
  geometry.setAttribute('aGlyph', new THREE.BufferAttribute(cloud.glyph, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(cloud.seed, 1))
  geometry.setAttribute('aLum', new THREE.BufferAttribute(cloud.lum, 1))
  geometry.computeBoundingSphere()

  if (points) {
    group.remove(points)
    points.geometry.dispose()
  }
  points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  group.add(points)

  if (reducedMotion) render(0)
  else if (!raf && visible) loop(performance.now())
}

// --- pointer ---------------------------------------------------------------

function onPointerMove(event: PointerEvent) {
  const el = host.value
  if (!el || !renderer) return
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    onPointerLeave()
    return
  }
  ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1)

  const now = performance.now()
  if (pointer.lastAt) {
    const dt = Math.max(1, now - pointer.lastAt)
    const dist = Math.hypot(x - pointer.lastX, y - pointer.lastY)
    // px per ms, a brisk swipe is ~3
    pointer.speed = dist / dt
  }
  pointer.lastX = x
  pointer.lastY = y
  pointer.lastAt = now
  pointer.targetActive = 1

  // where the cursor ray crosses the cloud's own plane, in its local space
  raycaster.setFromCamera(ndc, camera)
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion)
  plane.setFromNormalAndCoplanarPoint(normal, group.position)
  if (raycaster.ray.intersectPlane(plane, hit)) {
    group.worldToLocal(hit)
    pointer.tx = hit.x
    pointer.ty = hit.y
  }
  if (reducedMotion) render(0)
}

function onPointerLeave() {
  pointer.targetActive = 0
  pointer.speed = 0
}

/** `pointerout` with no related target means the cursor left the window */
function onPointerOut(event: PointerEvent) {
  if (!event.relatedTarget) onPointerLeave()
}

// --- frame -----------------------------------------------------------------

function render(dt: number) {
  if (!renderer) return
  const cfg = props.config

  // camera
  camera.fov = cfg.fov
  camera.updateProjectionMatrix()
  const px = ndc.x * cfg.parallax * 1.5 * pointer.active
  const py = ndc.y * cfg.parallax * 1.0 * pointer.active
  camera.position.set(px, py, cfg.cameraDistance)
  camera.lookAt(0, 0, 0)

  const rad = Math.PI / 180
  group.rotation.x = cfg.tiltX * rad
  group.rotation.y = cfg.tiltY * rad + cfg.autoRotate * rad * elapsed

  // object-fit: how much of the plane the frustum sees at z = 0, versus the
  // plane itself. a little extra so parallax never uncovers an edge.
  const visibleH = 2 * cfg.cameraDistance * Math.tan((cfg.fov * rad) / 2)
  const visibleW = visibleH * camera.aspect
  const sx = visibleW / cloudSize.width
  const sy = visibleH / cloudSize.height
  const fit = cfg.fit === 'cover' ? Math.max(sx, sy) * (1 + cfg.parallax * 0.2) : Math.min(sx, sy)
  group.scale.setScalar(fit * cfg.zoom)
  group.position.set((cfg.offsetX * visibleW) / 2, (cfg.offsetY * visibleH) / 2, 0)

  // pointer easing: position and presence follow the cursor, speed decays
  const ease = 1 - Math.pow(1 - cfg.mouseEase, dt * 60)
  pointer.x += (pointer.tx - pointer.x) * ease
  pointer.y += (pointer.ty - pointer.y) * ease
  pointer.active += (pointer.targetActive - pointer.active) * ease

  // a floor of turbulence is always on — the field is never a clean circle —
  // and cursor speed takes it the rest of the way up
  const stale = performance.now() - pointer.lastAt > 90
  const speedNow = stale ? 0 : pointer.speed
  const fromSpeed = Math.min(1, speedNow * 0.35) * (1 - cfg.turbulenceBase)
  const turbTarget = (cfg.turbulenceBase + fromSpeed) * cfg.turbulence
  const smooth = 1 - Math.pow(cfg.velocitySmoothing, dt * 60)
  pointer.turb += (turbTarget - pointer.turb) * smooth

  uniforms.uTime.value = elapsed
  uniforms.uNoiseW.value = elapsed * cfg.noiseSpeed
  uniforms.uNoiseScale.value = cfg.noiseScale
  uniforms.uNoiseAmp.value = cfg.noiseAmplitude
  uniforms.uMouse.value.set(pointer.x, pointer.y)
  uniforms.uMouseActive.value = pointer.active
  uniforms.uMouseRadius.value = cfg.mouseRadius
  uniforms.uMouseStrength.value = cfg.mouseStrength
  uniforms.uMouseSoftness.value = cfg.mouseSoftness
  uniforms.uTurb.value = pointer.turb
  uniforms.uTurbScale.value = cfg.turbulenceScale
  uniforms.uTurbW.value = elapsed * cfg.turbulenceSpeed
  uniforms.uSize.value = cfg.size
  uniforms.uSizeVar.value = cfg.sizeVariance
  uniforms.uCamDist.value = cfg.cameraDistance
  uniforms.uDepth.value = cfg.depth
  uniforms.uDepthFade.value = cfg.depthFade
  uniforms.uOpacity.value = cfg.opacity
  const [r, g, b] = hexToRgb(cfg.color)
  uniforms.uColor.value.set(r, g, b)

  renderer.render(scene, camera)
}

function loop(now: number) {
  raf = 0
  if (!renderer || !visible || reducedMotion) return
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 1 / 60
  lastFrame = now
  elapsed += dt
  render(dt)
  raf = requestAnimationFrame(loop)
}

// --- lifecycle -------------------------------------------------------------

onMounted(() => {
  if (!host.value) return
  setup(host.value)
  rebuild().catch((error) => console.error('[cloud] build failed:', error))
})

// geometry-shaping fields: rebuild; everything else is read per frame
watch(
  () => [
    props.config.image,
    props.config.columns,
    props.config.threshold,
    props.config.density,
    props.config.jitter,
    props.config.depth,
    props.config.depthFromLuminance,
    props.config.charset,
    props.config.glyphMode,
  ],
  () => rebuild(),
)

watch(() => props.config.height, () => nextTick(resize))

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  raf = 0
  resizeObserver?.disconnect()
  intersection?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerMove)
  document.removeEventListener('pointerout', onPointerOut)
  window.removeEventListener('blur', onPointerLeave)
  points?.geometry.dispose()
  material?.dispose()
  atlas?.texture.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
  points = null
  atlas = null
  mask = null
  maskKey = ''
  atlasCharset = ''
})
</script>

<template>
  <!-- as a background the canvas must live outside the page's stacking context -->
  <Teleport to="body" :disabled="config.placement !== 'background'">
    <div
      ref="host"
      class="cloud"
      :class="{ 'is-background': config.placement === 'background' }"
      :style="{
        height: config.placement === 'background' ? undefined : `${config.height}px`,
        background: config.background === 'transparent' ? 'transparent' : config.background,
      }"
      aria-hidden="true"
    />
  </Teleport>
</template>

<style scoped>
.cloud {
  width: 100%;
  overflow: hidden;
  touch-action: pan-y;
}

/* behind the sheet of paper (which is position: relative; z-index: 1) */
.cloud.is-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
