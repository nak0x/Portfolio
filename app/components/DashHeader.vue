<script setup lang="ts">
import type { DashSession } from '#shared/types/dash'
import { dashLogout } from '~/composables/useDash'

const props = defineProps<{ session: DashSession }>()
const emit = defineEmits<{ 'signed-out': [] }>()

async function logout() {
  await dashLogout()
  emit('signed-out')
  await navigateTo('/dash')
}
</script>

<template>
  <header class="dash-head">
    <div class="row title-row">
      <h1>/dash</h1>
      <span v-if="props.session.repo" class="muted small nowrap">
        {{ props.session.provider }} · {{ props.session.repo }}@{{ props.session.branch }}
      </span>
      <span
        v-if="props.session.authenticated && !props.session.writable"
        class="flash flash-error tiny"
      >
        read-only — no CONTENT_TOKEN
      </span>
    </div>

    <nav v-if="props.session.authenticated" class="row nav small">
      <NuxtLink to="/dash">posts</NuxtLink>
      <NuxtLink to="/dash/site">portfolio</NuxtLink>
      <a href="/" target="_blank" rel="noopener">view site ↗</a>
      <button class="btn btn-ghost" type="button" @click="logout">logout</button>
    </nav>
  </header>
</template>

<style scoped>
.dash-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 2rem 0 1.5rem;
}

h1 {
  font-size: 1.4rem;
}

.title-row {
  align-items: center;
  gap: 0.75rem;
}

.nav {
  gap: 1rem;
  align-items: center;
}

.nav a.router-link-exact-active {
  color: var(--accent);
}
</style>
