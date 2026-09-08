<script setup lang="ts">
import {
  EFFECT_RANGES,
  FITS,
  GLYPH_MODES,
  PLACEMENTS,
  defaultEffectConfig,
  type EffectConfig,
  type EffectNumberKey,
} from '#shared/effect'
import type { DashSession } from '#shared/types/dash'
import type { Revision } from '~~/server/utils/revisions'
import { EMPTY_SESSION, errorText } from '~/composables/useDash'
import { prepareUpload } from '~/utils/cloud'

definePageMeta({ middleware: 'dash' })

useSeoMeta({ title: 'dash · effect', robots: 'noindex, nofollow' })

type EffectDocument = Revision<EffectConfig>

const requestFetch = useRequestFetch()

const { data } = await useAsyncData(
  'dash:effect',
  async () => {
    const [session, doc] = await Promise.all([
      requestFetch<DashSession>('/api/dash/session'),
      requestFetch<EffectDocument>('/api/dash/effect'),
    ])
    return { session, doc }
  },
  {
    default: () => ({
      session: { ...EMPTY_SESSION },
      doc: { data: structuredClone(defaultEffectConfig), revision: 0, revisedAt: '', message: '' } as EffectDocument,
    }),
  },
)

const session = computed<DashSession>(() => data.value.session)

const form = ref<EffectConfig>(structuredClone(defaultEffectConfig))
const revision = ref(0)
const revisedAt = ref('')
const snapshot = ref('')
const message = ref('')

function hydrate() {
  form.value = structuredClone(toRaw(data.value.doc.data))
  revision.value = data.value.doc.revision
  revisedAt.value = data.value.doc.revisedAt
  snapshot.value = JSON.stringify(form.value)
}

watch(data, hydrate, { immediate: true })

const dirty = computed(() => JSON.stringify(form.value) !== snapshot.value)

const range = (key: EffectNumberKey) => EFFECT_RANGES[key]

// the preview always sits in its box; the home page may use it as a background
const preview = computed<EffectConfig>(() => ({ ...form.value, placement: 'block' }))

// --- image -----------------------------------------------------------------

const uploading = ref(false)
const uploadError = ref('')
const hasImage = computed(() => !!form.value.image)
const imageBytes = computed(() =>
  form.value.image?.startsWith('data:') ? Math.round((form.value.image.length * 3) / 4 / 1024) : null,
)

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    form.value.image = await prepareUpload(file)
  } catch (e) {
    uploadError.value = errorText(e, 'could not read that image')
  } finally {
    uploading.value = false
  }
}

function clearImage() {
  form.value.image = null
}

// --- background ------------------------------------------------------------

const transparent = computed({
  get: () => form.value.background === 'transparent',
  set: (v: boolean) => {
    form.value.background = v ? 'transparent' : '#0e0e10'
  },
})

// --- saving ----------------------------------------------------------------

const busy = ref(false)
const flash = ref<{ text: string; kind: 'ok' | 'error' } | null>(null)

async function save() {
  if (busy.value) return
  busy.value = true
  flash.value = null
  try {
    const result = await $fetch<EffectDocument>('/api/dash/effect', {
      method: 'PUT',
      body: { data: form.value, revision: revision.value, message: message.value },
    })
    revision.value = result.revision
    revisedAt.value = result.revisedAt
    form.value = structuredClone(result.data)
    snapshot.value = JSON.stringify(form.value)
    message.value = ''
    flash.value = { text: `saved revision ${result.revision} — the home page is live with it`, kind: 'ok' }
    await refreshNuxtData('effect')
  } catch (e) {
    flash.value = { text: errorText(e, 'could not save'), kind: 'error' }
  } finally {
    busy.value = false
  }
}

function revert() {
  hydrate()
  flash.value = null
}

function resetDefaults() {
  const image = form.value.image
  form.value = { ...structuredClone(defaultEffectConfig), image }
}

const stamp = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(
    new Date(iso),
  ) + ' UTC'

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return confirm('you have unsaved changes. leave anyway?')
})
</script>

<template>
  <div>
    <DashHeader :session="session" />

    <div class="bar">
      <p class="small muted">
        revision <span class="accent">#{{ revision }}</span>
        <span v-if="revisedAt">· saved {{ stamp(revisedAt) }}</span>
        <span v-if="data.doc.message" class="faint">· "{{ data.doc.message }}"</span>
      </p>
      <span v-if="dirty" class="accent tiny nowrap">● unsaved</span>
    </div>

    <FrameBox :tag="form.placement === 'block' ? form.label || 'preview' : 'preview'" class="block preview-frame">
      <div class="preview" :style="{ height: `${form.height}px` }">
        <ClientOnly>
          <AsciiCloud :config="preview" />
        </ClientOnly>
      </div>
      <p class="tiny muted preview-note">
        live — every slider below is applied here as you move it, the home page gets it on save.
        <span v-if="form.placement === 'background'">on the home page it fills the whole window, behind the content.</span>
      </p>
    </FrameBox>

    <div class="grid-2 top">
      <FrameBox tag="block" class="block">
        <div class="stack-sm">
          <label class="checkbox">
            <input v-model="form.enabled" type="checkbox">
            <span>show the effect on the home page</span>
          </label>
          <label class="field">
            <span class="label">placement</span>
            <select v-model="form.placement" class="select">
              <option v-for="value in PLACEMENTS" :key="value" :value="value">
                {{ value === 'background' ? 'background — full window, behind the page' : 'block — a frame under the banner' }}
              </option>
            </select>
          </label>
          <template v-if="form.placement === 'block'">
            <label class="field">
              <span class="label">frame tag</span>
              <input v-model="form.label" class="input" type="text" placeholder="/summit">
            </label>
            <DashSlider v-model="form.height" label="height (px)" v-bind="range('height')" />
          </template>
          <DashSlider v-else v-model="form.height" label="preview height (px)" hint="only the preview above; the page uses the window" v-bind="range('height')" />
          <label class="field">
            <span class="label">fit</span>
            <select v-model="form.fit" class="select">
              <option v-for="value in FITS" :key="value" :value="value">
                {{ value === 'cover' ? 'cover — fill, crop the overflow' : 'contain — whole image, may leave room' }}
              </option>
            </select>
          </label>
          <DashSlider v-model="form.zoom" label="zoom" hint="1 = exact fit" v-bind="range('zoom')" />
          <DashSlider v-model="form.offsetX" label="pan x" v-bind="range('offsetX')" />
          <DashSlider v-model="form.offsetY" label="pan y" v-bind="range('offsetY')" />
        </div>
      </FrameBox>

      <FrameBox tag="source image" class="block">
        <div class="stack-sm">
          <p class="small muted">
            black is where the points go, white is empty. the file is shrunk to 480px and turned
            grey before it is stored, so a photo or a hand-drawn silhouette both work.
          </p>
          <div class="upload-row">
            <img v-if="hasImage" :src="form.image!" class="thumb" alt="">
            <div v-else class="thumb thumb-empty tiny faint">procedural ridge</div>
            <div class="upload-actions">
              <label class="btn">
                {{ uploading ? 'reading…' : hasImage ? 'replace image' : 'upload image' }}
                <input type="file" accept="image/*" class="file" :disabled="uploading" @change="onFile">
              </label>
              <button v-if="hasImage" class="btn btn-ghost" type="button" @click="clearImage">remove</button>
              <span v-if="imageBytes" class="tiny faint">{{ imageBytes }}KB</span>
            </div>
          </div>
          <p v-if="uploadError" class="flash flash-error small">{{ uploadError }}</p>
        </div>
      </FrameBox>
    </div>

    <FrameBox tag="sampling" class="block">
      <div class="controls">
        <DashSlider v-model="form.threshold" label="threshold (ceil)" hint="cells darker than this become points" v-bind="range('threshold')" />
        <DashSlider v-model="form.columns" label="columns" hint="grid width; rows follow the image" v-bind="range('columns')" />
        <DashSlider v-model="form.density" label="density" hint="share of eligible cells kept" v-bind="range('density')" />
        <DashSlider v-model="form.jitter" label="jitter" hint="random offset inside the cell" v-bind="range('jitter')" />
        <DashSlider v-model="form.depth" label="depth" hint="z spread, the image is 10 units wide" v-bind="range('depth')" />
        <DashSlider v-model="form.depthFromLuminance" label="depth from darkness" hint="0 = random z, 1 = darker cells in front" v-bind="range('depthFromLuminance')" />
      </div>
    </FrameBox>

    <FrameBox tag="glyphs" class="block">
      <div class="controls">
        <label class="field">
          <span class="label">charset</span>
          <input v-model="form.charset" class="input" type="text" spellcheck="false">
          <span class="tiny faint">lightest to densest, when the mode is luminance or depth</span>
        </label>
        <label class="field">
          <span class="label">which glyph per point</span>
          <select v-model="form.glyphMode" class="select">
            <option v-for="mode in GLYPH_MODES" :key="mode" :value="mode">{{ mode }}</option>
          </select>
        </label>
        <DashSlider v-model="form.size" label="size (px)" v-bind="range('size')" />
        <DashSlider v-model="form.sizeVariance" label="size variance" v-bind="range('sizeVariance')" />
        <DashSlider v-model="form.opacity" label="opacity" v-bind="range('opacity')" />
        <DashSlider v-model="form.depthFade" label="depth fade" hint="points further back get fainter" v-bind="range('depthFade')" />
        <label class="field">
          <span class="label">colour</span>
          <span class="color-row">
            <input v-model="form.color" type="color" class="swatch">
            <input v-model="form.color" class="input" type="text" spellcheck="false">
          </span>
        </label>
        <div class="field">
          <span class="label">background</span>
          <label class="checkbox">
            <input v-model="transparent" type="checkbox">
            <span>transparent (the paper shows through)</span>
          </label>
          <span v-if="!transparent" class="color-row">
            <input v-model="form.background" type="color" class="swatch">
            <input v-model="form.background" class="input" type="text" spellcheck="false">
          </span>
        </div>
      </div>
    </FrameBox>

    <FrameBox tag="idle motion" class="block">
      <div class="controls">
        <DashSlider v-model="form.noiseScale" label="noise scale" hint="spatial frequency of the drift" v-bind="range('noiseScale')" />
        <DashSlider v-model="form.noiseAmplitude" label="noise amplitude" hint="how far points wander" v-bind="range('noiseAmplitude')" />
        <DashSlider v-model="form.noiseSpeed" label="noise speed" hint="w = speed × seconds" v-bind="range('noiseSpeed')" />
      </div>
    </FrameBox>

    <FrameBox tag="cursor" class="block">
      <div class="controls">
        <DashSlider v-model="form.mouseRadius" label="radius" hint="size of the repulsive field" v-bind="range('mouseRadius')" />
        <DashSlider v-model="form.mouseStrength" label="strength" hint="push at the centre" v-bind="range('mouseStrength')" />
        <DashSlider v-model="form.mouseSoftness" label="softness" hint="1 = long soft tails, 6 = a tighter disc" v-bind="range('mouseSoftness')" />
        <DashSlider v-model="form.turbulence" label="turbulence" hint="how far from a clean circle the field gets" v-bind="range('turbulence')" />
        <DashSlider v-model="form.turbulenceBase" label="turbulence floor" hint="always on, cursor still; 1 = speed changes nothing" v-bind="range('turbulenceBase')" />
        <DashSlider v-model="form.turbulenceScale" label="turbulence scale" hint="how fine the distortion is" v-bind="range('turbulenceScale')" />
        <DashSlider v-model="form.turbulenceSpeed" label="turbulence drift" hint="w = drift × seconds, so the shape keeps changing" v-bind="range('turbulenceSpeed')" />
        <DashSlider v-model="form.velocitySmoothing" label="velocity smoothing" hint="higher = the speed-driven part lingers" v-bind="range('velocitySmoothing')" />
        <DashSlider v-model="form.mouseEase" label="ease" hint="how quickly the field follows the cursor" v-bind="range('mouseEase')" />
      </div>
    </FrameBox>

    <FrameBox tag="camera" class="block">
      <div class="controls">
        <DashSlider v-model="form.fov" label="field of view" v-bind="range('fov')" />
        <DashSlider v-model="form.cameraDistance" label="distance" v-bind="range('cameraDistance')" />
        <DashSlider v-model="form.tiltX" label="tilt x (°)" v-bind="range('tiltX')" />
        <DashSlider v-model="form.tiltY" label="tilt y (°)" v-bind="range('tiltY')" />
        <DashSlider v-model="form.autoRotate" label="auto rotate (°/s)" v-bind="range('autoRotate')" />
        <DashSlider v-model="form.parallax" label="parallax" hint="camera drifts with the cursor" v-bind="range('parallax')" />
      </div>
    </FrameBox>

    <FrameBox tag="save" class="block">
      <div class="commit-row">
        <label class="field msg">
          <span class="label">note for this revision</span>
          <input v-model="message" class="input" type="text" placeholder="update effect">
        </label>
        <div class="row commit-actions">
          <button class="btn btn-primary" type="button" :disabled="busy || !dirty" @click="save">
            {{ busy ? 'saving…' : 'save' }}
          </button>
          <button class="btn" type="button" :disabled="!dirty || busy" @click="revert">revert</button>
          <button class="btn btn-ghost" type="button" :disabled="busy" @click="resetDefaults">defaults</button>
        </div>
      </div>
      <p v-if="flash" class="flash note" :class="`flash-${flash.kind}`">{{ flash.text }}</p>
    </FrameBox>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.block {
  margin-bottom: 1.25rem;
}

.preview-frame {
  padding: 0;
}

.preview {
  width: 100%;
  overflow: hidden;
}

.preview-note {
  padding: 0.35rem 0.75rem;
  border-top: 1px dashed var(--ink-faint);
}

.top {
  margin-bottom: 0;
}

.controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem 1.25rem;
  align-items: start;
}

@media (max-width: 860px) {
  .controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .controls {
    grid-template-columns: 1fr;
  }
}

.upload-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.thumb {
  width: 120px;
  height: 72px;
  object-fit: cover;
  border: 1px solid var(--ink-faint);
  background: #fff;
  flex-shrink: 0;
}

.thumb-empty {
  display: grid;
  place-items: center;
  background: transparent;
}

.upload-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.file {
  display: none;
}

.color-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-row .input {
  flex: 1;
  min-width: 0;
}

.swatch {
  width: 2.2rem;
  height: 1.9rem;
  padding: 0;
  border: 1px solid var(--ink-faint);
  background: transparent;
  cursor: pointer;
}

.commit-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.msg {
  flex: 1;
  min-width: 16rem;
}

.commit-actions {
  gap: 0.5rem;
}

.note {
  margin-top: 0.75rem;
}
</style>
