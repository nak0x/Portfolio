<script setup lang="ts">
import { dashLogin, errorText } from '~/composables/useDash'

const props = defineProps<{ enabled: boolean; handle: string }>()
const emit = defineEmits<{ done: [] }>()

const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  if (!password.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await dashLogin(password.value)
    password.value = ''
    emit('done')
  } catch (e) {
    error.value = errorText(e, 'could not sign in')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="frame login">
    <span class="frame-tag">auth</span>

    <template v-if="props.enabled">
      <p class="small muted intro">
        <span class="accent">$</span> sudo -u {{ props.handle }} edit site
      </p>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span class="label">password</span>
          <input
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            :disabled="busy"
          >
        </label>
        <button class="btn btn-primary" type="submit" :disabled="busy || !password">
          {{ busy ? 'checking…' : 'unlock' }}
        </button>
      </form>

      <p v-if="error" class="flash flash-error err">{{ error }}</p>
    </template>

    <p v-else class="small muted">
      the dashboard is off. set <code>DASH_PASSWORD</code> in the environment and restart.
    </p>
  </div>
</template>

<style scoped>
.login {
  max-width: 26rem;
  margin: 3rem auto;
}

.intro {
  margin-bottom: 1rem;
}

.form {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.form .field {
  flex: 1;
}

.err {
  margin-top: 0.75rem;
}
</style>
