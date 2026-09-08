<script setup lang="ts">
const { site } = useSiteData()

const year = new Date().getFullYear()
</script>

<template>
  <footer class="foot">
    <hr>
    <div class="row foot-row small">
      <span class="muted">© {{ year }} {{ site.name }} — no trackers, no cookies.</span>
      <span class="links">
        <a v-for="link in site.links" :key="link.href" :href="link.href">{{ link.label }}</a>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.foot {
  margin-top: 3rem;
}

.foot-row {
  justify-content: space-between;
}

.links {
  display: inline-flex;
  gap: 1rem;
  flex-wrap: wrap;
}

hr {
  margin: 2rem 0 1rem;
  border-top: 1px solid var(--ink);
}
</style>
