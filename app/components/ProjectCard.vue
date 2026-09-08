<script setup lang="ts">
import type { Project } from '#shared/site'
import type { RepoProject } from '#shared/types/projects'

const props = defineProps<{ project: Project | RepoProject; compact?: boolean }>()

const statusGlyph: Record<NonNullable<Project['status']>, string> = {
  active: '●',
  wip: '◐',
  shipped: '✓',
  archived: '□',
}

const sourceGlyph: Record<RepoProject['source'], string> = {
  github: 'gh',
  gitea: 'gitea',
  manual: '',
}

/** repo metadata is absent on hand-written entries */
const repo = computed(() => ('source' in props.project ? props.project : null))
</script>

<template>
  <FrameBox :to="props.project.href" hover :tag="props.project.year" class="card">
    <div class="head">
      <h2>{{ props.project.name }}</h2>
      <span class="arrow muted">↗</span>
    </div>

    <p class="muted small tagline">{{ props.project.tagline }}</p>

    <ul v-if="!props.compact && props.project.bullets?.length" class="bullets">
      <li v-for="bullet in props.project.bullets" :key="bullet">{{ bullet }}</li>
    </ul>

    <div class="foot row small">
      <span class="stack-line muted">{{ props.project.stack.join(' · ') }}</span>
      <span class="meta faint">
        <span v-if="repo && sourceGlyph[repo.source]" class="origin">
          {{ sourceGlyph[repo.source] }}
        </span>
        <span v-if="repo && repo.stars" class="stars">★ {{ repo.stars }}</span>
        <span v-if="props.project.status" class="status">
          <span class="accent">{{ statusGlyph[props.project.status] }}</span>
          {{ props.project.status }}
        </span>
      </span>
    </div>
  </FrameBox>
</template>

<style scoped>
.card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

h2 {
  font-size: 1.05rem;
  text-transform: lowercase;
  letter-spacing: -0.01em;
}

.tagline {
  margin-top: 0.35rem;
}

.foot {
  margin-top: auto;
  padding-top: 1rem;
  justify-content: space-between;
  gap: 0.75rem;
}

.stack-line {
  font-size: 0.8rem;
}

.meta {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
</style>
