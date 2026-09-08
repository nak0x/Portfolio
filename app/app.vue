<script setup lang="ts">
const { public: pub } = useRuntimeConfig()
const { site } = useSiteData()

useHead({
  titleTemplate: (chunk) => (chunk ? `${chunk} — ${site.value.domain}` : site.value.domain),
})

useSeoMeta({
  description: () => site.value.description,
  ogType: 'website',
  ogSiteName: () => site.value.domain,
  ogUrl: pub.siteUrl,
  twitterCard: 'summary',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
