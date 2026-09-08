<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** the little label that sits on the top border */
    tag?: string
    /** highlight the border in the accent color on hover — use it when the box is a link */
    hover?: boolean
    /** internal route, external url, or nothing */
    to?: string
  }>(),
  { hover: false },
)

// resolveComponent has to run in setup, not lazily inside a computed
const NuxtLinkComponent = resolveComponent('NuxtLink')

const isExternal = computed(() => !!props.to && /^(https?:|mailto:)/i.test(props.to))
const component = computed(() => {
  if (!props.to) return 'div'
  return isExternal.value ? 'a' : NuxtLinkComponent
})

const bindings = computed(() => {
  if (!props.to) return {}
  return isExternal.value
    ? { href: props.to, target: '_blank', rel: 'noopener noreferrer' }
    : { to: props.to }
})
</script>

<template>
  <component
    :is="component"
    v-bind="bindings"
    class="frame frame-box"
    :class="{ 'accent-on-hover': props.hover }"
  >
    <span v-if="props.tag" class="frame-tag">{{ props.tag }}</span>
    <slot />
  </component>
</template>

<style scoped>
.frame-box {
  display: block;
  color: var(--ink);
  text-decoration: none;
}
</style>
