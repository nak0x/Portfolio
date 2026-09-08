<script setup lang="ts">
import type { DashSession, PostDraft, PostFrontmatterInput, SaveResult } from '#shared/types/dash'
import type { TocEntry } from '#shared/types/blog'
import { EMPTY_SESSION, errorText } from '~/composables/useDash'

definePageMeta({ middleware: 'dash' })

const route = useRoute()
const requestFetch = useRequestFetch()

const slug = computed(() => String(route.params.slug))
const isNew = computed(() => slug.value === 'new')

const today = new Date().toISOString().slice(0, 10)

function blankDraft(): PostDraft {
  return {
    path: '',
    sha: '',
    sourceUrl: '',
    frontmatter: {
      title: '',
      description: '',
      date: today,
      updated: '',
      tags: [],
      slug: '',
      draft: true,
    },
    body: '',
  }
}

const { data } = await useAsyncData(
  () => `dash:post:${slug.value}`,
  async () => {
    const session = await requestFetch<DashSession>('/api/dash/session')
    if (isNew.value) return { session, draft: blankDraft() }
    const draft = await requestFetch<PostDraft>(`/api/dash/posts/${slug.value}`)
    return { session, draft }
  },
  {
    watch: [slug],
    default: () => ({ session: { ...EMPTY_SESSION }, draft: blankDraft() }),
  },
)

const session = computed<DashSession>(() => data.value.session)

// --- editable state -------------------------------------------------------

const form = reactive<PostFrontmatterInput>({ ...blankDraft().frontmatter })
const body = ref('')
const sha = ref('')
const path = ref('')
const sourceUrl = ref('')
const message = ref('')

const tagsText = computed({
  get: () => form.tags.join(', '),
  set: (value: string) => {
    form.tags = value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  },
})

/** a stable snapshot, so "dirty" means the file would actually change */
const snapshot = ref('')
const fingerprint = () => JSON.stringify({ ...form, body: body.value })
const dirty = computed(() => fingerprint() !== snapshot.value)

function hydrate() {
  const draft = data.value.draft
  Object.assign(form, draft.frontmatter)
  body.value = draft.body
  sha.value = draft.sha
  path.value = draft.path
  sourceUrl.value = draft.sourceUrl
  snapshot.value = fingerprint()
}

watch(data, hydrate, { immediate: true })

// --- preview --------------------------------------------------------------

type View = 'split' | 'edit' | 'preview'
const view = ref<View>('split')
const preview = ref<{ html: string; toc: TocEntry[]; readingTime: number } | null>(null)
const previewing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function renderPreview() {
  previewing.value = true
  try {
    preview.value = await $fetch('/api/dash/preview', {
      method: 'POST',
      body: { body: body.value, path: path.value },
    })
  } catch {
    // a failed preview is not worth interrupting the writing for
  } finally {
    previewing.value = false
  }
}

function schedulePreview() {
  clearTimeout(timer)
  timer = setTimeout(renderPreview, 450)
}

watch(body, () => {
  if (view.value !== 'edit') schedulePreview()
})

watch(view, (v) => {
  if (v !== 'edit' && !preview.value) renderPreview()
})

onMounted(renderPreview)
onBeforeUnmount(() => clearTimeout(timer))

// --- saving ---------------------------------------------------------------

const busy = ref(false)
const flash = ref<{ text: string; kind: 'ok' | 'error' } | null>(null)
const pendingDelete = ref(false)

const canSave = computed(() => session.value.writable && !busy.value && !!form.title.trim())

async function save() {
  if (!canSave.value) return
  busy.value = true
  flash.value = null

  const payload = {
    frontmatter: { ...form },
    body: body.value,
    message: message.value,
    sha: sha.value || undefined,
  }

  try {
    const result = isNew.value
      ? await $fetch<SaveResult>('/api/dash/posts', { method: 'POST', body: payload })
      : await $fetch<SaveResult>(`/api/dash/posts/${slug.value}`, { method: 'PUT', body: payload })

    sha.value = result.sha
    path.value = result.path
    message.value = ''
    snapshot.value = fingerprint()
    flash.value = {
      text: `committed ${result.path}${result.commit ? ` (${result.commit.slice(0, 7)})` : ''}`,
      kind: 'ok',
    }

    if (result.slug !== slug.value) await navigateTo(`/dash/posts/${result.slug}`)
  } catch (e) {
    flash.value = { text: errorText(e, 'could not save'), kind: 'error' }
  } finally {
    busy.value = false
  }
}

async function destroy() {
  busy.value = true
  flash.value = null
  try {
    await $fetch(`/api/dash/posts/${slug.value}`, {
      method: 'DELETE',
      body: { message: message.value },
    })
    snapshot.value = fingerprint() // stop the leave guard from firing
    await navigateTo('/dash')
  } catch (e) {
    flash.value = { text: errorText(e, 'could not delete'), kind: 'error' }
    busy.value = false
  }
}

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return confirm('you have unsaved changes. leave anyway?')
})

useSeoMeta({
  title: () => (isNew.value ? 'new post' : `edit ${slug.value}`),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div>
    <DashHeader :session="session" />

    <div class="bar">
      <div class="row crumbs small muted">
        <NuxtLink to="/dash">../dash</NuxtLink>
        <span>/</span>
        <span>{{ isNew ? 'new post' : path || slug }}</span>
        <span v-if="dirty" class="accent tiny">● unsaved</span>
      </div>

      <div class="row tools">
        <div class="views">
          <button
            v-for="option in (['edit', 'split', 'preview'] as const)"
            :key="option"
            class="btn btn-ghost"
            :class="{ on: view === option }"
            type="button"
            @click="view = option"
          >{{ option }}</button>
        </div>
        <a v-if="sourceUrl && !isNew" class="btn btn-ghost" :href="sourceUrl" target="_blank" rel="noopener">raw ↗</a>
        <NuxtLink v-if="!isNew" class="btn btn-ghost" :to="`/blog/${form.slug || slug}`" target="_blank">view ↗</NuxtLink>
      </div>
    </div>

    <FrameBox tag="frontmatter" class="meta">
      <div class="meta-grid">
        <label class="field span-2">
          <span class="label">title</span>
          <input v-model="form.title" class="input" type="text" placeholder="how this blog works">
        </label>

        <label class="field">
          <span class="label">slug (url)</span>
          <input v-model="form.slug" class="input" type="text" :placeholder="'auto from title'">
        </label>

        <label class="field">
          <span class="label">date</span>
          <input v-model="form.date" class="input" type="date">
        </label>

        <label class="field">
          <span class="label">updated (optional)</span>
          <input v-model="form.updated" class="input" type="date">
        </label>

        <label class="field span-2">
          <span class="label">description</span>
          <input v-model="form.description" class="input" type="text" placeholder="leave empty to use the first paragraph">
        </label>

        <label class="field span-2">
          <span class="label">tags (comma separated)</span>
          <input v-model="tagsText" class="input" type="text" placeholder="rust, self-hosting">
        </label>

        <label class="checkbox draft-toggle">
          <input v-model="form.draft" type="checkbox">
          <span>draft — hidden in production</span>
        </label>
      </div>
    </FrameBox>

    <div class="panes" :class="`view-${view}`">
      <FrameBox v-if="view !== 'preview'" tag="markdown" class="pane">
        <textarea
          v-model="body"
          class="textarea editor"
          spellcheck="false"
          placeholder="# heading&#10;&#10;write here."
        />
      </FrameBox>

      <FrameBox v-if="view !== 'edit'" tag="preview" class="pane">
        <div class="pane-head small faint">
          <span>{{ preview?.readingTime ?? 1 }} min read</span>
          <span v-if="previewing" class="accent">rendering…</span>
        </div>
        <!-- server-rendered by the same pipeline the published page uses -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="prose preview-body" v-html="preview?.html ?? ''" />
      </FrameBox>
    </div>

    <FrameBox tag="commit" class="commit">
      <div class="commit-row">
        <label class="field msg">
          <span class="label">commit message</span>
          <input
            v-model="message"
            class="input"
            type="text"
            :placeholder="isNew ? `post: add ${form.slug || 'new-post'}` : `post: update ${form.slug || slug}`"
          >
        </label>

        <div class="row commit-actions">
          <button class="btn btn-primary" type="button" :disabled="!canSave" @click="save">
            {{ busy ? 'committing…' : isNew ? 'create' : 'save' }}
          </button>

          <template v-if="!isNew">
            <template v-if="pendingDelete">
              <span class="small muted">delete this post?</span>
              <button class="btn btn-danger" type="button" :disabled="busy" @click="destroy">yes, delete</button>
              <button class="btn btn-ghost" type="button" @click="pendingDelete = false">cancel</button>
            </template>
            <button
              v-else
              class="btn"
              type="button"
              :disabled="!session.writable || busy"
              @click="pendingDelete = true"
            >delete</button>
          </template>
        </div>
      </div>

      <p v-if="!session.writable" class="flash flash-error note">
        no write token configured — set <code>CONTENT_TOKEN</code> to commit from here.
      </p>
      <p v-else-if="flash" class="flash note" :class="`flash-${flash.kind}`">{{ flash.text }}</p>
    </FrameBox>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.crumbs {
  gap: 0.4rem;
  align-items: baseline;
}

.tools {
  gap: 0.5rem;
  align-items: center;
}

.views {
  display: inline-flex;
  border: 1px solid var(--ink-faint);
}

.views .btn {
  border: 0;
  font-size: 0.8rem;
}

.views .btn.on {
  background: var(--ink);
  color: var(--paper);
}

.meta {
  margin-bottom: 1.25rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

.span-2 {
  grid-column: span 3;
}

.draft-toggle {
  grid-column: span 3;
  margin-top: 0.25rem;
}

@media (max-width: 720px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .span-2,
  .draft-toggle {
    grid-column: span 1;
  }
}

.panes {
  display: grid;
  gap: 1.25rem;
  align-items: stretch;
}

.panes.view-split {
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 900px) {
  .panes.view-split {
    grid-template-columns: 1fr;
  }
}

.pane {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.editor {
  min-height: 26rem;
  height: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 0.88rem;
}

.editor:focus {
  box-shadow: none;
}

.pane-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.5rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px dashed var(--ink-faint);
}

.preview-body {
  min-height: 24rem;
  overflow-wrap: anywhere;
}

.commit {
  margin-top: 1.25rem;
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
  align-items: center;
}

.note {
  margin-top: 0.75rem;
}
</style>
