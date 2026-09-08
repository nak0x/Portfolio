<script setup lang="ts">
const model = defineModel<number>({ required: true })

const props = defineProps<{
  label: string
  min: number
  max: number
  step: number
  hint?: string
}>()

const decimals = computed(() => {
  const s = String(props.step)
  return s.includes('.') ? s.split('.')[1]!.length : 0
})

function set(event: Event) {
  const n = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(n)) model.value = Math.min(props.max, Math.max(props.min, n))
}
</script>

<template>
  <label class="slider" :title="hint">
    <span class="head">
      <span class="label">{{ label }}</span>
      <input class="input num" type="number" :min="min" :max="max" :step="step" :value="model.toFixed(decimals)" @change="set">
    </span>
    <input class="range" type="range" :min="min" :max="max" :step="step" :value="model" @input="set">
    <span v-if="hint" class="tiny faint hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.slider {
  display: grid;
  gap: 0.2rem;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.num {
  width: 5.5rem;
  text-align: right;
  padding: 0.05rem 0.3rem;
  font-variant-numeric: tabular-nums;
}

.range {
  width: 100%;
  accent-color: var(--accent);
  margin: 0;
}

.hint {
  line-height: 1.3;
}
</style>
