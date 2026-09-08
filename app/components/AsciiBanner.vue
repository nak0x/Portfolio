<script setup lang="ts">
const { site } = useSiteData()

const banner = String.raw`███╗   ██╗ █████╗ ██╗  ██╗ ██████╗ ██╗  ██╗
████╗  ██║██╔══██╗██║ ██╔╝██╔═████╗╚██╗██╔╝
██╔██╗ ██║███████║█████╔╝ ██║██╔██║ ╚███╔╝ 
██║╚██╗██║██╔══██║██╔═██╗ ████╔╝██║ ██╔██╗ 
██║ ╚████║██║  ██║██║  ██╗╚██████╔╝██╔╝ ██╗
╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝`
</script>

<template>
  <section class="hero">
    <div class="frame hero-frame">
      <div class="banner-wrap">
        <pre class="banner" aria-label="nak0x">{{ banner }}</pre>
      </div>
      <hr>
      <div class="sub-row">
        <span class="domain">{{ site.domain }}</span>
        <span class="sep">//</span>
        <span class="muted">{{ site.role }}</span>
        <span class="sep">//</span>
        <span class="muted">{{ site.location }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  margin: 1.5rem 0 2rem;
}

.hero-frame {
  padding: 1.25rem 1.5rem;
  overflow: hidden;
  container-type: inline-size;
}

.banner-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.banner {
  display: block;
  font-size: clamp(5px, 1.85cqi, 15px);
  line-height: 1.05;
  letter-spacing: 0;
  color: var(--ink);
  white-space: pre;
  text-align: center;
  margin: 0.5rem auto;
}

.sub-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  font-size: 0.95rem;
}

.domain {
  color: var(--accent);
  font-weight: 600;
}

.sep {
  color: var(--ink-faint);
}

hr {
  margin: 0.75rem 0;
}
</style>
