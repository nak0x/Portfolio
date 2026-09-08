<script setup lang="ts">
const model = defineModel<string[]>({ required: true })

const props = withDefaults(
  defineProps<{ placeholder?: string; multiline?: boolean; addLabel?: string }>(),
  { placeholder: '', multiline: false, addLabel: 'add' },
)

function update(index: number, value: string) {
  const next = [...model.value]
  next[index] = value
  model.value = next
}

function remove(index: number) {
  model.value = model.value.filter((_, i) => i !== index)
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= model.value.length) return
  const next = [...model.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item as string)
  model.value = next
}

function add() {
  model.value = [...model.value, '']
}
</script>

<template>
  <div class="list">
    <div v-for="(item, index) in model" :key="index" class="row-item">
      <textarea
        v-if="props.multiline"
        class="textarea"
        rows="3"
        :value="item"
        :placeholder="props.placeholder"
        @input="update(index, ($event.target as HTMLTextAreaElement).value)"
      />
      <input
        v-else
        class="input"
        type="text"
        :value="item"
        :placeholder="props.placeholder"
        @input="update(index, ($event.target as HTMLInputElement).value)"
      >
      <div class="controls">
        <button class="btn btn-ghost" type="button" title="move up" @click="move(index, -1)">↑</button>
        <button class="btn btn-ghost" type="button" title="move down" @click="move(index, 1)">↓</button>
        <button class="btn btn-ghost" type="button" title="remove" @click="remove(index)">×</button>
      </div>
    </div>

    <button class="btn" type="button" @click="add">+ {{ props.addLabel }}</button>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
}

.row-item {
  display: flex;
  gap: 0.35rem;
  align-items: flex-start;
}

.row-item > :first-child {
  flex: 1;
  min-width: 0;
}

.controls {
  display: flex;
  gap: 0.1rem;
}

.controls .btn {
  padding: 0.3rem 0.4rem;
}
</style>
