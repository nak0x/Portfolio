<script setup lang="ts">
import type { Post, PostMeta } from '#shared/types/blog'

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data, error } = await useFetch<{
  post: Post
  previous: PostMeta | null
  next: PostMeta | null
}>(() => `/api/blog/${slug.value}`, { key: () => `post-${slug.value}` })

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    message: error.value.statusCode === 404 ? 'no such post' : 'could not load this post',
    fatal: true,
  })
}

const post = computed(() => data.value!.post)

const published = computed(() =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(post.value.date),
  ),
)

const updated = computed(() =>
  post.value.updated
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(post.value.updated),
      )
    : null,
)

useSeoMeta({
  title: () => post.value.title,
  description: () => post.value.description,
  ogTitle: () => post.value.title,
  ogDescription: () => post.value.description,
  ogType: 'article',
  articlePublishedTime: () => post.value.date,
  articleTag: () => [...post.value.tags],
})
</script>

<template>
  <article v-if="post">
    <header class="head">
      <p class="small muted crumbs">
        <NuxtLink to="/blog">../blog</NuxtLink> / {{ post.slug }}.md
      </p>
      <h1>{{ post.title }}</h1>
      <p class="muted small lede">{{ post.description }}</p>

      <div class="row meta small faint">
        <span>{{ published }}</span>
        <span v-if="updated">· updated {{ updated }}</span>
        <span>· {{ post.readingTime }} min</span>
        <span v-if="post.tags.length">
          ·
          <NuxtLink
            v-for="tag in post.tags"
            :key="tag"
            :to="{ path: '/blog', query: { tag } }"
            class="tag"
          >#{{ tag }}</NuxtLink>
        </span>
        <span v-if="post.draft" class="accent">· draft</span>
      </div>
    </header>

    <AsciiRule />

    <div class="body">
      <aside v-if="post.toc.length > 2" class="toc">
        <div class="frame toc-frame">
          <span class="frame-tag">contents</span>
          <ul>
            <li v-for="entry in post.toc" :key="entry.id" :class="`d${entry.depth}`">
              <a :href="`#${entry.id}`">{{ entry.text }}</a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- rendered server-side from the repo's markdown -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="prose" v-html="post.html" />
    </div>

    <AsciiRule />

    <nav class="neighbours grid-2">
      <FrameBox v-if="data?.previous" :to="`/blog/${data.previous.slug}`" hover tag="older">
        <span class="small">← {{ data.previous.title }}</span>
      </FrameBox>
      <span v-else />
      <FrameBox v-if="data?.next" :to="`/blog/${data.next.slug}`" hover tag="newer" class="right">
        <span class="small">{{ data.next.title }} →</span>
      </FrameBox>
    </nav>

    <p v-if="post.sourceUrl" class="small faint source">
      <a :href="post.sourceUrl" target="_blank" rel="noopener noreferrer">→ view the raw markdown</a>
    </p>
  </article>
</template>

<style scoped>
.head {
  margin: 2rem 0 0;
}

.crumbs {
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 1.6rem;
  letter-spacing: -0.02em;
}

.lede {
  margin-top: 0.5rem;
}

.meta {
  margin-top: 0.75rem;
  gap: 0.35rem;
}

.tag {
  margin-left: 0.35rem;
}

.body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 940px) {
  .body {
    grid-template-columns: minmax(0, 1fr) 15rem;
  }

  .toc {
    order: 2;
  }

  .toc-frame {
    position: sticky;
    top: 1.5rem;
  }
}

.toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}

.toc li + li {
  margin-top: 0.3rem;
}

.toc .d3 {
  padding-left: 1rem;
}

.toc a {
  text-decoration: none;
  color: var(--ink-mute);
}

.toc a:hover {
  color: var(--paper);
}

.neighbours {
  align-items: stretch;
}

.right {
  text-align: right;
}

.source {
  margin-top: 1.5rem;
  text-align: right;
}
</style>
