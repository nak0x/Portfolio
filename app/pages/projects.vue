<script setup lang="ts">
const { site } = useSiteData()
const { projects, failed } = useProjects()

const groups = computed(() => {
  const all = projects.value
  const active = all.filter((p) => p.status === 'active' || p.status === 'wip')
  const rest = all.filter((p) => p.status !== 'active' && p.status !== 'wip')
  return [
    { label: 'in flight', items: active },
    { label: 'the shelf', items: rest },
  ].filter((g) => g.items.length)
})

useSeoMeta({
  title: 'projects',
  description: 'every public repo nak0x owns, on github and on his own gitea.',
})
</script>

<template>
  <div>
    <header class="head">
      <h1>projects</h1>
      <p class="muted small">
        {{ projects.length }} public repositories, read straight off github and gitea.
        most of them started as "this should take an evening".
      </p>
    </header>

    <p v-if="failed.length" class="small faint warn">
      {{ failed.map((s) => s.kind).join(' and ') }} did not answer — this list is short a few
      entries.
    </p>

    <template v-for="group in groups" :key="group.label">
      <AsciiRule :label="group.label" />
      <section class="grid-2">
        <ProjectCard v-for="project in group.items" :key="project.href" :project="project" />
      </section>
    </template>

    <p v-if="!projects.length" class="muted small empty">
      no repositories came back. either both forges are down, or the accounts are misconfigured.
    </p>

    <AsciiRule />

    <p class="small muted">
      more of it lives on
      <a
        v-for="(link, i) in site.links.filter((l) => l.href.startsWith('http'))"
        :key="link.href"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
      >{{ i ? ', ' : '' }}{{ link.label }}</a>.
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

.warn {
  margin-top: 0.75rem;
}

.empty {
  margin-top: 1rem;
}
</style>
