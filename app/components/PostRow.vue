<script setup lang="ts">
import type { PostMeta } from '#shared/types/blog'

const props = defineProps<{ post: PostMeta }>()

const stamp = computed(() =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'short', timeZone: 'UTC' }).format(
    new Date(props.post.date),
  ),
)
</script>

<template>
  <NuxtLink :to="`/blog/${props.post.slug}`" class="post-row">
    <div class="line">
      <span class="stamp muted small">{{ stamp }}</span>
      <span class="title">{{ props.post.title }}</span>
      <span v-if="props.post.draft" class="badge accent tiny">draft</span>
      <span class="dots" aria-hidden="true" />
      <span class="time faint small nowrap">{{ props.post.readingTime }} min</span>
    </div>
    <p class="desc muted small">{{ props.post.description }}</p>
    <div v-if="props.post.tags.length" class="tags faint tiny">
      <span v-for="tag in props.post.tags" :key="tag">#{{ tag }}</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.post-row {
  display: block;
  text-decoration: none;
  color: var(--ink);
  padding: 0.85rem 0.5rem;
  border-bottom: 1px dashed var(--ink-faint);
}

.post-row:hover {
  background: var(--paper-soft);
}

.post-row:hover .title {
  color: var(--accent);
}

.line {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.stamp {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.title {
  font-weight: 600;
}

.badge {
  border: 1px solid var(--accent);
  padding: 0 0.3rem;
}

.dots {
  flex: 1;
  min-width: 1rem;
  border-bottom: 1px dotted var(--ink-faint);
  transform: translateY(-0.25em);
}

.desc {
  margin-top: 0.25rem;
}

.tags {
  margin-top: 0.35rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 560px) {
  .dots { display: none; }
  .line { flex-wrap: wrap; }
}
</style>
