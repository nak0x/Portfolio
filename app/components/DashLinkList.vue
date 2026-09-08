<script setup lang="ts">
import type { ProjectLink } from '#shared/site'

const model = defineModel<ProjectLink[]>({ required: true })

const props = withDefaults(defineProps<{ addLabel?: string }>(), { addLabel: 'add link' })

function update(index: number, key: keyof ProjectLink, value: string) {
  model.value = model.value.map((link, i) => (i === index ? { ...link, [key]: value } : link))
}

function remove(index: number) {
  model.value = model.value.filter((_, i) => i !== index)
}

function add() {
  model.value = [...model.value, { label: '', href: '' }]
}
</script>

<template>
  <div class="list">
    <div v-for="(link, index) in model" :key="index" class="pair">
      <input
        class="input label-input"
        type="text"
        placeholder="label"
        :value="link.label"
        @input="update(index, 'label', ($event.target as HTMLInputElement).value)"
      >
      <input
        class="input"
        type="text"
        placeholder="https://…"
        :value="link.href"
        @input="update(index, 'href', ($event.target as HTMLInputElement).value)"
      >
      <button class="btn btn-ghost" type="button" title="remove" @click="remove(index)">×</button>
    </div>

    <button class="btn" type="button" @click="add">+ {{ props.addLabel }}</button>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
}

.pair {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.pair > .input {
  flex: 1;
  min-width: 0;
}

.label-input {
  max-width: 9rem;
}
</style>
