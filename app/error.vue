<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const code = computed(() => props.error?.statusCode ?? 500)
const message = computed(
  () => props.error?.message || props.error?.statusMessage || 'something went sideways',
)
</script>

<template>
  <div class="paper">
    <StatusBar />

    <div class="frame err">
      <span class="frame-tag">error</span>
      <pre class="code accent">{{ code }}</pre>
      <p class="muted">{{ message }}</p>
      <p class="small muted back">
        <NuxtLink to="/">cd ~</NuxtLink>
      </p>
    </div>

    <SiteFooter />
  </div>
</template>

<style scoped>
.err {
  margin-top: 3rem;
  text-align: center;
  padding: 3rem 1.5rem;
}

.code {
  font-size: clamp(3rem, 12vw, 6rem);
  font-weight: 700;
  line-height: 1;
}

.back {
  margin-top: 1.5rem;
}
</style>
