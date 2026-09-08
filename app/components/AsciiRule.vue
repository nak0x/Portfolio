<script setup lang="ts">
const props = withDefaults(defineProps<{ char?: string; label?: string }>(), {
  char: '*',
})
</script>

<template>
  <div class="rule-row" aria-hidden="true">
    <span class="ascii-rule fill">{{ props.char.repeat(200) }}</span>
    <span v-if="props.label" class="label tiny muted">{{ props.label }}</span>
    <span v-if="props.label" class="ascii-rule fill">{{ props.char.repeat(200) }}</span>
  </div>
</template>

<style scoped>
.rule-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow: hidden;
  margin: 2rem 0;
}

.fill {
  flex: 1;
  min-width: 0;
}

.label {
  white-space: nowrap;
}
</style>
