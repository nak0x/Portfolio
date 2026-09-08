<script setup lang="ts">
import type { DashPost, DashSession } from '#shared/types/dash'
import { EMPTY_SESSION, errorText } from '~/composables/useDash'

useSeoMeta({ title: 'dash', robots: 'noindex, nofollow' })

const requestFetch = useRequestFetch()
const { site } = useSiteData()

interface Overview {
  session: DashSession
  posts: DashPost[]
  /** why the post list is missing — the repo being broken must not hide the rest */
  postsError: string | null
}

const { data, refresh } = await useAsyncData<Overview>(
  'dash:overview',
  async () => {
    const session = await requestFetch<DashSession>('/api/dash/session')
    if (!session.authenticated) return { session, posts: [], postsError: null }

    try {
      const { posts } = await requestFetch<{ posts: DashPost[] }>('/api/dash/posts')
      return { session, posts, postsError: null }
    } catch (e) {
      return { session, posts: [], postsError: errorText(e, 'could not list posts') }
    }
  },
  { default: () => ({ session: { ...EMPTY_SESSION }, posts: [], postsError: null }) },
)

const session = computed(() => data.value.session)
const posts = computed(() => data.value.posts)
const postsError = computed(() => data.value.postsError)
const published = computed(() => posts.value.filter((p) => !p.draft).length)
const drafts = computed(() => posts.value.length - published.value)

const busy = ref(false)
const flash = ref<{ text: string; kind: 'ok' | 'error' } | null>(null)
const pendingDelete = ref<string | null>(null)

function say(text: string, kind: 'ok' | 'error' = 'ok') {
  flash.value = { text, kind }
}

async function refreshCache() {
  busy.value = true
  flash.value = null
  try {
    const { cleared, postsError } = await $fetch<{ cleared: number; postsError: string | null }>(
      '/api/dash/refresh',
      { method: 'POST' },
    )
    await refresh()
    if (postsError) say(`dropped ${cleared} cached entries, but the post source still fails`, 'error')
    else say(`re-read the repo, dropped ${cleared} cached ${cleared === 1 ? 'entry' : 'entries'}`)
  } catch (e) {
    say(errorText(e, 'could not refresh'), 'error')
  } finally {
    busy.value = false
  }
}

async function confirmDelete(slug: string) {
  busy.value = true
  flash.value = null
  try {
    await $fetch(`/api/dash/posts/${slug}`, { method: 'DELETE' })
    pendingDelete.value = null
    await refresh()
    say(`deleted ${slug}`)
  } catch (e) {
    say(errorText(e, 'could not delete'), 'error')
  } finally {
    busy.value = false
  }
}

const stamp = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(iso))
</script>

<template>
  <div>
    <DashHeader :session="session" @signed-out="refresh" />

    <DashLogin
      v-if="!session.authenticated"
      :enabled="session.enabled"
      :handle="site.handle"
      @done="refresh"
    />

    <template v-else>
      <section class="grid-2 top">
        <FrameBox tag="source">
          <dl class="def-list">
            <dt>provider</dt>
            <dd>{{ session.provider }}</dd>
            <dt>repo</dt>
            <dd>{{ session.repo }} <span class="faint">@{{ session.branch }}</span></dd>
            <dt>posts in</dt>
            <dd>{{ session.dir || '<repo root>' }}/</dd>
            <dt>post writes</dt>
            <dd :class="session.writable ? 'accent' : ''">
              {{ session.writable ? 'enabled' : 'disabled — set CONTENT_TOKEN' }}
            </dd>
            <dt>portfolio</dt>
            <dd>sqlite <span class="faint">· <NuxtLink to="/dash/site">edit</NuxtLink></span></dd>
            <dt>home effect</dt>
            <dd>sqlite <span class="faint">· <NuxtLink to="/dash/effect">edit</NuxtLink></span></dd>
            <dt>webhook</dt>
            <dd>{{ session.webhook ? 'configured' : 'not configured' }}</dd>
            <dt>cache ttl</dt>
            <dd>{{ session.ttl }}s</dd>
          </dl>
        </FrameBox>

        <FrameBox tag="state">
          <div class="counts">
            <div>
              <span class="count accent">{{ published }}</span>
              <span class="muted small">published</span>
            </div>
            <div>
              <span class="count">{{ drafts }}</span>
              <span class="muted small">draft{{ drafts === 1 ? '' : 's' }}</span>
            </div>
          </div>

          <div class="row actions">
            <NuxtLink class="btn btn-primary" to="/dash/posts/new">+ new post</NuxtLink>
            <button class="btn" type="button" :disabled="busy" @click="refreshCache">
              re-read repo
            </button>
          </div>

          <p v-if="flash" class="flash" :class="`flash-${flash.kind}`">{{ flash.text }}</p>
        </FrameBox>
      </section>

      <AsciiRule label="posts" />

      <FrameBox tag="posts">
        <div v-if="postsError" class="flash flash-error empty">
          <p>the post source is not answering — the portfolio editor still works.</p>
          <p class="small">{{ postsError }}</p>
          <p class="small muted">
            check <code>GITEA_URL</code>, <code>CONTENT_REPO</code> and <code>CONTENT_BRANCH</code>,
            then "re-read repo" above.
          </p>
        </div>

        <p v-else-if="!posts.length" class="muted small empty">
          no markdown found in <code>{{ session.repo }}/{{ session.dir }}</code>. create the first
          one — it will be committed for you.
        </p>

        <table v-else class="posts">
          <tbody>
            <tr v-for="post in posts" :key="post.slug">
              <td class="stamp muted small">{{ stamp(post.date) }}</td>
              <td class="title">
                <NuxtLink :to="`/dash/posts/${post.slug}`">{{ post.title }}</NuxtLink>
                <span v-if="post.draft" class="badge accent tiny">draft</span>
              </td>
              <td class="tags faint tiny">
                <span v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
              </td>
              <td class="acts">
                <template v-if="pendingDelete === post.slug">
                  <span class="small muted">delete?</span>
                  <button
                    class="btn btn-ghost btn-danger"
                    type="button"
                    :disabled="busy"
                    @click="confirmDelete(post.slug)"
                  >yes</button>
                  <button class="btn btn-ghost" type="button" @click="pendingDelete = null">no</button>
                </template>
                <template v-else>
                  <NuxtLink class="btn btn-ghost" :to="`/blog/${post.slug}`" target="_blank">view</NuxtLink>
                  <button
                    class="btn btn-ghost"
                    type="button"
                    :disabled="!session.writable"
                    :title="session.writable ? 'delete' : 'read-only'"
                    @click="pendingDelete = post.slug"
                  >×</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </FrameBox>
    </template>
  </div>
</template>

<style scoped>
.top {
  align-items: stretch;
}

.counts {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.25rem;
}

.counts > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.count {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.actions {
  gap: 0.5rem;
}

.flash {
  margin-top: 1rem;
}

.empty {
  padding: 1rem 0;
}

.posts {
  width: 100%;
  border-collapse: collapse;
}

.posts td {
  padding: 0.5rem 0.4rem;
  border-bottom: 1px dashed var(--ink-faint);
  vertical-align: baseline;
}

.posts tr:last-child td {
  border-bottom: 0;
}

.stamp {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  width: 1%;
}

.title a {
  text-decoration: none;
  font-weight: 600;
}

.title a:hover {
  color: var(--accent);
  background: none;
}

.badge {
  border: 1px solid var(--accent);
  padding: 0 0.3rem;
  margin-left: 0.5rem;
}

.tags span + span {
  margin-left: 0.4rem;
}

.acts {
  text-align: right;
  white-space: nowrap;
  width: 1%;
}

.acts .btn {
  text-decoration: none;
}

@media (max-width: 640px) {
  .posts,
  .posts tbody,
  .posts tr,
  .posts td {
    display: block;
    width: auto;
  }

  .posts tr {
    padding: 0.5rem 0;
    border-bottom: 1px dashed var(--ink-faint);
  }

  .posts td {
    border: 0;
    padding: 0.1rem 0;
  }

  .acts {
    text-align: left;
    margin-top: 0.35rem;
  }
}
</style>
