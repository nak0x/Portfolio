<script setup lang="ts">
const { site } = useSiteData()
const route = useRoute()
const { theme, mounted, toggle } = useTheme()

const path = computed(() => {
  const p = route.path.replace(/\/+$/, '')
  return p === '' ? '~' : `~${p}`
})

const cmd = computed(() => {
  const p = route.path
  if (p === '/') return 'cat about.md'
  if (p === '/projects') return 'ls -la ./projects'
  if (p === '/blog') return 'ls ./posts'
  if (p.startsWith('/blog/')) return `bat posts/${p.slice(6)}.md`
  return `find . -path "${p}"`
})

const clock = ref('--:--:--')
let timer: ReturnType<typeof setInterval> | undefined

function tick() {
  clock.value = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: site.value.timezone,
  }).format(new Date())
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="status">
    <div class="status-left">
      <span class="prompt">{{ site.handle }}@dev</span>
      <span class="sep">:</span>
      <span class="path">{{ path }}</span>
      <span class="dollar">$</span>
      <span class="cmd"><slot name="cmd">{{ cmd }}</slot></span>
      <span class="cursor">_</span>
    </div>

    <div class="status-right small">
      <NuxtLink v-for="item in site.nav" :key="item.href" :to="item.href">
        {{ item.label }}
      </NuxtLink>
      <span class="sep">|</span>
      <button class="theme-toggle" type="button" :aria-label="`switch to ${theme === 'dark' ? 'light' : 'dark'} theme`" @click="toggle">
        <span class="theme-icon">{{ mounted && theme === 'dark' ? '◐' : '◑' }}</span>
        <span>{{ mounted ? theme : 'theme' }}</span>
      </button>
      <span class="sep">|</span>
      <span class="muted nowrap">{{ clock }}</span>
    </div>
  </div>
</template>

<style scoped>
.status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  background: var(--paper);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-left,
.status-right {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.status-right {
  gap: 0.6rem;
}

.prompt { color: var(--accent); }
.sep { color: var(--ink-mute); }
.path { color: var(--ink); }
.dollar { color: var(--ink-mute); }
.cmd { color: var(--ink); }

.cursor {
  display: inline-block;
  color: var(--ink);
  animation: blink 1s steps(1, end) infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .cursor { animation: none; }
}

.theme-toggle {
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
}

.theme-toggle:hover {
  background: var(--accent);
  color: var(--paper);
  text-decoration: none;
}

.theme-icon { color: var(--accent); }
.theme-toggle:hover .theme-icon { color: var(--paper); }
</style>
