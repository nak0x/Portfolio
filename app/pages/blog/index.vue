<script setup lang="ts">
import type { PostMeta } from '#shared/types/blog'

const route = useRoute()
const activeTag = computed(() => (route.query.tag as string | undefined) ?? '')

const { data, error, status } = await useFetch<{
  posts: PostMeta[]
  tags: Array<{ tag: string; count: number }>
}>('/api/blog', {
  key: 'blog-index',
  query: { tag: activeTag },
  default: () => ({ posts: [], tags: [] }),
})

const posts = computed(() => data.value?.posts ?? [])
const tags = computed(() => data.value?.tags ?? [])

useSeoMeta({
  title: 'blog',
  description: 'notes on rust, self-hosting, and making slow hardware feel fast.',
})
</script>

<template>
  <div>
    <header class="head">
      <h1>blog</h1>
      <p class="muted small">
        written in markdown, pushed to a git repo, rendered here. no CMS was harmed.
      </p>
    </header>

    <AsciiRule />

    <nav v-if="tags.length" class="tags small">
      <NuxtLink to="/blog" :class="{ active: !activeTag }">all</NuxtLink>
      <NuxtLink
        v-for="t in tags"
        :key="t.tag"
        :to="{ path: '/blog', query: { tag: t.tag } }"
        :class="{ active: activeTag === t.tag }"
      >
        #{{ t.tag }} <span class="faint">{{ t.count }}</span>
      </NuxtLink>
    </nav>

    <FrameBox :tag="activeTag ? `posts · #${activeTag}` : 'posts'" class="list">
      <p v-if="error" class="muted small state">
        the content repo did not answer ({{ error.statusCode ?? '???' }}). it will retry on its own.
      </p>
      <p v-else-if="status === 'pending' && !posts.length" class="muted small state">
        reading the repo…
      </p>
      <p v-else-if="!posts.length" class="muted small state">
        nothing here yet. push a <code>.md</code> to the content repo and it shows up.
      </p>
      <PostRow v-for="post in posts" :key="post.slug" :post="post" />
    </FrameBox>

    <p class="small muted feed">
      <a href="/rss.xml">→ rss</a>
    </p>
  </div>
</template>

<style scoped>
.head {
  margin: 2rem 0 0;
}

.head p {
  margin-top: 0.35rem;
}

.tags {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.tags a {
  text-decoration: none;
  border: 1px solid var(--ink-faint);
  padding: 0.1rem 0.5rem;
}

.tags a:hover,
.tags a.active {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.list :deep(.post-row:last-child) {
  border-bottom: 0;
}

.state {
  padding: 1rem 0;
}

.feed {
  margin-top: 1.25rem;
  text-align: right;
}
</style>
