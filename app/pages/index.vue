<script setup lang="ts">
import type { PostMeta } from '#shared/types/blog'

const { site } = useSiteData()
const { featured } = useProjects()

const { data } = await useFetch<{ posts: PostMeta[] }>('/api/blog', {
  key: 'home-posts',
  default: () => ({ posts: [] }),
})

const latest = computed(() => (data.value?.posts ?? []).slice(0, 3))

useSeoMeta({
  title: '',
  description: () => site.value.description,
  ogTitle: () => site.value.domain,
  ogDescription: () => site.value.description,
})
</script>

<template>
  <div>
    <AsciiBanner />

    <section id="about" class="grid-2">
      <FrameBox tag="/about">
        <div class="stack-sm">
          <p v-for="line in site.about" :key="line" class="small">{{ line }}</p>
        </div>
        <dl class="def-list about-meta">
          <dt>where</dt>
          <dd>{{ site.location }}</dd>
          <dt>work</dt>
          <dd>
            {{ site.role }} @
            <a :href="site.company.href" target="_blank" rel="noopener noreferrer">{{ site.company.name }}</a>
          </dd>
          <dt>elsewhere</dt>
          <dd>
            <span class="inline-links">
              <a v-for="link in site.links" :key="link.href" :href="link.href">{{ link.label }}</a>
            </span>
          </dd>
        </dl>
      </FrameBox>

      <FrameBox tag="/skills">
        <dl class="def-list">
          <template v-for="group in site.skills" :key="group.label">
            <dt>{{ group.label }}</dt>
            <dd>{{ group.items.join(', ') }}</dd>
          </template>
        </dl>
        <p class="small muted note">
          the list is descriptive, not aspirational — everything here shipped something.
        </p>
      </FrameBox>
    </section>

    <AsciiRule label="selected work" />

    <section class="grid-2">
      <ProjectCard v-for="project in featured" :key="project.href" :project="project" />
    </section>

    <p class="more small">
      <NuxtLink to="/projects">→ everything else</NuxtLink>
    </p>

    <AsciiRule label="writing" />

    <section>
      <FrameBox tag="/blog">
        <template v-if="latest.length">
          <PostRow v-for="post in latest" :key="post.slug" :post="post" />
          <p class="more small">
            <NuxtLink to="/blog">→ all posts</NuxtLink>
          </p>
        </template>
        <p v-else class="muted small empty">
          nothing published yet. the feed is wired to the content repo — the first push fills it.
        </p>
      </FrameBox>
    </section>

    <AsciiRule label="contact" />

    <FrameBox tag="/contact" class="contact">
      <p class="small">
        mail is the fastest way in.
        <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a>
      </p>
      <p class="small muted">
        patches, questions and "your site broke on my machine" reports all welcome.
      </p>
    </FrameBox>
  </div>
</template>

<style scoped>
.about-meta {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--ink-faint);
}

.inline-links {
  display: inline-flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.note {
  margin-top: 1.25rem;
}

.more {
  margin-top: 1rem;
  text-align: right;
}

.empty {
  padding: 1rem 0;
}

.contact p + p {
  margin-top: 0.5rem;
}
</style>
