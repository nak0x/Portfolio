<script setup lang="ts">
import { PROJECT_STATUSES, defaultSiteData, type Project, type SiteData } from '#shared/site'
import type { DashSession } from '#shared/types/dash'
import { EMPTY_SESSION, errorText } from '~/composables/useDash'

definePageMeta({ middleware: 'dash' })

useSeoMeta({ title: 'dash · portfolio', robots: 'noindex, nofollow' })

const requestFetch = useRequestFetch()

const { data } = await useAsyncData(
  'dash:site',
  async () => {
    const [session, doc] = await Promise.all([
      requestFetch<DashSession>('/api/dash/session'),
      requestFetch<{ data: SiteData; sha: string | null; fromRepo: boolean }>('/api/dash/site'),
    ])
    return { session, doc }
  },
  {
    default: () => ({
      session: { ...EMPTY_SESSION },
      doc: { data: structuredClone(defaultSiteData), sha: null, fromRepo: false },
    }),
  },
)

const session = computed<DashSession>(() => data.value.session)

const form = ref<SiteData>(structuredClone(defaultSiteData))
const sha = ref<string | null>(null)
const fromRepo = ref(false)
const snapshot = ref('')
const message = ref('')

function hydrate() {
  form.value = structuredClone(toRaw(data.value.doc.data))
  sha.value = data.value.doc.sha
  fromRepo.value = data.value.doc.fromRepo
  snapshot.value = JSON.stringify(form.value)
}

watch(data, hydrate, { immediate: true })

const dirty = computed(() => JSON.stringify(form.value) !== snapshot.value)

// word lists (skills, stack) are edited as one comma-separated field
const joinList = (items: string[]) => items.join(', ')
const parseList = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean)
const inputValue = (event: Event) => (event.target as HTMLInputElement).value

// --- projects -------------------------------------------------------------

const openProject = ref<number | null>(null)

function blankProject(): Project {
  return {
    name: '',
    tagline: '',
    bullets: [],
    stack: [],
    year: String(new Date().getFullYear()),
    href: '',
    links: [],
    featured: false,
    hidden: false,
    status: 'wip',
  }
}

function addProject() {
  form.value.projects = [...form.value.projects, blankProject()]
  openProject.value = form.value.projects.length - 1
}

function removeProject(index: number) {
  form.value.projects = form.value.projects.filter((_, i) => i !== index)
  openProject.value = null
}

function moveProject(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= form.value.projects.length) return
  const next = [...form.value.projects]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item as Project)
  form.value.projects = next
  openProject.value = target
}

// --- skills ---------------------------------------------------------------

function addSkillGroup() {
  form.value.skills = [...form.value.skills, { label: '', items: [] }]
}

function removeSkillGroup(index: number) {
  form.value.skills = form.value.skills.filter((_, i) => i !== index)
}

// --- saving ---------------------------------------------------------------

const busy = ref(false)
const flash = ref<{ text: string; kind: 'ok' | 'error' } | null>(null)

async function save() {
  if (!session.value.writable || busy.value) return
  busy.value = true
  flash.value = null

  try {
    const result = await $fetch<{ sha: string; commit?: string; data: SiteData }>('/api/dash/site', {
      method: 'PUT',
      body: { data: form.value, sha: sha.value, message: message.value },
    })
    sha.value = result.sha
    fromRepo.value = true
    form.value = structuredClone(result.data)
    snapshot.value = JSON.stringify(form.value)
    message.value = ''
    flash.value = {
      text: `committed${result.commit ? ` ${result.commit.slice(0, 7)}` : ''} — the site is live with these values`,
      kind: 'ok',
    }
    await refreshNuxtData('site')
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
        writes <code>{{ session.siteFile }}</code> to {{ session.repo }}.
        <span v-if="!fromRepo" class="accent">the repo has no {{ session.siteFile }} yet — saving creates it.</span>
      </p>
      <span v-if="dirty" class="accent tiny nowrap">● unsaved</span>
    </div>

    <FrameBox tag="identity" class="block">
      <div class="grid">
        <label class="field">
          <span class="label">name</span>
          <input v-model="form.name" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">handle</span>
          <input v-model="form.handle" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">domain</span>
          <input v-model="form.domain" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">role</span>
          <input v-model="form.role" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">company</span>
          <input v-model="form.company.name" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">company url</span>
          <input v-model="form.company.href" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">location</span>
          <input v-model="form.location" class="input" type="text">
        </label>
        <label class="field">
          <span class="label">timezone (clock in the status bar)</span>
          <input v-model="form.timezone" class="input" type="text" placeholder="Europe/Paris">
        </label>
        <label class="field">
          <span class="label">contact email</span>
          <input v-model="form.contactEmail" class="input" type="text">
        </label>
      </div>
    </FrameBox>

    <FrameBox tag="copy" class="block">
      <div class="stack">
        <label class="field">
          <span class="label">tagline</span>
          <input v-model="form.tagline" class="input" type="text">
        </label>

        <label class="field">
          <span class="label">meta description (search results, og tags, rss)</span>
          <textarea v-model="form.description" class="textarea" rows="3" />
        </label>

        <div class="field">
          <span class="label">about — one paragraph per entry</span>
          <DashStringList v-model="form.about" multiline add-label="paragraph" />
        </div>
      </div>
    </FrameBox>

    <FrameBox tag="skills" class="block">
      <div class="stack">
        <div v-for="(group, index) in form.skills" :key="index" class="skill-row">
          <input v-model="group.label" class="input group-label" type="text" placeholder="languages">
          <input
            class="input"
            type="text"
            placeholder="rust, typescript, python"
            :value="joinList(group.items)"
            @input="group.items = parseList(inputValue($event))"
          >
          <button class="btn btn-ghost" type="button" title="remove" @click="removeSkillGroup(index)">×</button>
        </div>
        <button class="btn" type="button" @click="addSkillGroup">+ group</button>
      </div>
    </FrameBox>

    <FrameBox tag="links" class="block">
      <p class="small muted hint">shown in the footer and in the about box. relative paths work too (<code>/rss.xml</code>).</p>
      <DashLinkList v-model="form.links" />
    </FrameBox>

    <FrameBox tag="projects" class="block">
      <p class="small muted hint">
        the public list is every repo on github + gitea. these entries only override the ones
        whose <code>href</code> or <code>name</code> matches — bullets, a nicer name, the featured
        flag. an entry that matches nothing is shown as-is.
      </p>
      <div class="stack">
        <div v-for="(project, index) in form.projects" :key="index" class="project">
          <div class="project-head">
            <button
              class="btn btn-ghost expand"
              type="button"
              @click="openProject = openProject === index ? null : index"
            >
              <span class="accent">{{ openProject === index ? '−' : '+' }}</span>
              <span class="pname">{{ project.name || 'untitled' }}</span>
              <span class="faint tiny">
                {{ project.status }}{{ project.featured ? ' · featured' : ''
                }}{{ project.hidden ? ' · hidden' : '' }}
              </span>
            </button>
            <div class="project-controls">
              <button class="btn btn-ghost" type="button" title="move up" @click="moveProject(index, -1)">↑</button>
              <button class="btn btn-ghost" type="button" title="move down" @click="moveProject(index, 1)">↓</button>
              <button class="btn btn-ghost" type="button" title="remove" @click="removeProject(index)">×</button>
            </div>
          </div>

          <div v-if="openProject === index" class="project-body">
            <div class="grid">
              <label class="field">
                <span class="label">name</span>
                <input v-model="project.name" class="input" type="text">
              </label>
              <label class="field">
                <span class="label">year</span>
                <input v-model="project.year" class="input" type="text" placeholder="2026 / ongoing">
              </label>
              <label class="field">
                <span class="label">status</span>
                <select v-model="project.status" class="select">
                  <option v-for="value in PROJECT_STATUSES" :key="value" :value="value">{{ value }}</option>
                </select>
              </label>
            </div>

            <label class="field">
              <span class="label">tagline</span>
              <input v-model="project.tagline" class="input" type="text">
            </label>

            <label class="field">
              <span class="label">url</span>
              <input v-model="project.href" class="input" type="text">
            </label>

            <label class="field">
              <span class="label">stack (comma separated)</span>
              <input
                class="input"
                type="text"
                :value="joinList(project.stack)"
                @input="project.stack = parseList(inputValue($event))"
              >
            </label>

            <div class="field">
              <span class="label">bullets — shown on featured cards</span>
              <DashStringList v-model="project.bullets" add-label="bullet" />
            </div>

            <div class="field">
              <span class="label">extra links</span>
              <DashLinkList v-model="project.links" />
            </div>

            <label class="checkbox">
              <input v-model="project.featured" type="checkbox">
              <span>featured on the home page</span>
            </label>

            <label class="checkbox">
              <input v-model="project.hidden" type="checkbox">
              <span>hide — keep this repo off the site</span>
            </label>
          </div>
        </div>

        <button class="btn" type="button" @click="addProject">+ project</button>
      </div>
    </FrameBox>

    <FrameBox tag="commit" class="block">
      <div class="commit-row">
        <label class="field msg">
          <span class="label">commit message</span>
          <input v-model="message" class="input" type="text" placeholder="site: update portfolio content">
        </label>
        <div class="row commit-actions">
          <button class="btn btn-primary" type="button" :disabled="!session.writable || busy || !dirty" @click="save">
            {{ busy ? 'committing…' : 'save' }}
          </button>
          <button class="btn" type="button" :disabled="!dirty || busy" @click="revert">revert</button>
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
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.block {
  margin-bottom: 1.25rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.hint {
  margin-bottom: 0.75rem;
}

.skill-row {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.skill-row > .input:not(.group-label) {
  flex: 1;
  min-width: 0;
}

.group-label {
  max-width: 9rem;
}

.project {
  border: 1px solid var(--ink-faint);
}

.project-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.35rem;
}

.expand {
  gap: 0.5rem;
  flex: 1;
  justify-content: flex-start;
  text-align: left;
}

.pname {
  font-weight: 600;
}

.project-controls {
  display: flex;
  gap: 0.1rem;
}

.project-body {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border-top: 1px dashed var(--ink-faint);
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
