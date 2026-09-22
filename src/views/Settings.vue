<template>
  <div class="container mx-auto pt-4 px-2">
    <h1 class="mb-4">
      Settings
    </h1>

    <h2 class="mb-2">
      Email
    </h2>

    <p v-if="loading && !options">
      Loading your settings…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load your settings: {{ error.message }}
    </p>
    <template v-else-if="options">
      <label class="flex items-start gap-2 max-w-prose">
        <input
          type="checkbox"
          class="mt-1"
          :checked="options.adminDigest"
          :disabled="saving"
          aria-describedby="admin-digest-description"
          @change="toggleAdminDigest($event)"
        >
        <span>Weekly admin digest</span>
      </label>
      <p id="admin-digest-description" class="text-sm max-w-prose mt-1 ml-6">
        A weekly email with what is new for you to act on: submitted tricks
        waiting for a review, new tricks to translate or level, and changed
        interface texts, each only if your access covers it. Nothing is sent in
        a week with nothing new.
        <template v-if="email">
          It goes to {{ email }}.
        </template>
        <template v-else>
          Your account has no verified email address, so there is nowhere to send it.
        </template>
      </p>
      <p v-if="saveError" role="alert" class="text-ttred-900 text-sm mt-1 ml-6">
        {{ saveError }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref } from 'vue'
import { useNotificationOptionsQuery, useSetNotificationOptionsMutation } from '../graphql/generated/graphql'

const { result, loading, error } = useNotificationOptionsQuery({ fetchPolicy: 'cache-and-network' })

const options = computed(() => result.value?.me?.notificationOptions ?? null)
const email = computed(() => result.value?.me?.email ?? null)

const saving = ref(false)
const saveError = ref<string | null>(null)

const { mutate: setNotificationOptions } = useSetNotificationOptionsMutation()

async function toggleAdminDigest (event: Event) {
  const checkbox = event.target as HTMLInputElement
  saveError.value = null
  saving.value = true
  try {
    await setNotificationOptions({ data: { adminDigest: checkbox.checked } })
  } catch (err) {
    // the query still holds the old value, so nothing would re-render the box
    checkbox.checked = options.value?.adminDigest ?? !checkbox.checked
    saveError.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    saving.value = false
  }
}

useHead({ title: 'Settings' })
</script>
