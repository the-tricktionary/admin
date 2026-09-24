<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-2xl"
    @close="emit('close')"
    @cancel="event => { if (saving) event.preventDefault() }"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save()">
      <h2 :id="titleId">
        {{ client ? `Edit ${client.name}` : 'New API client' }}
      </h2>

      <fieldset :disabled="saving" class="border-none p-0 m-0 flex flex-col gap-3">
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="api-client-name">Name</label>
            <input
              id="api-client-name"
              v-model="name"
              type="text"
              required
              maxlength="100"
              class="rounded"
              @input="suggestId()"
            >
          </div>

          <div class="flex flex-col gap-1">
            <label for="api-client-id">ID</label>
            <input
              id="api-client-id"
              v-model="clientId"
              type="text"
              required
              maxlength="40"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              :readonly="client !== null"
              :class="{ 'bg-sunken': client !== null }"
              aria-describedby="api-client-id-hint"
              class="rounded font-mono"
              @input="idTouched = true"
            >
            <p id="api-client-id-hint" class="text-muted text-sm m-0">
              What the usage metric counts it by. It cannot change later.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="api-client-contact">Contact (optional)</label>
          <input
            id="api-client-contact"
            v-model="contact"
            type="text"
            maxlength="200"
            placeholder="dev@example.com"
            class="rounded"
          >
        </div>

        <fieldset class="border border-line rounded p-2">
          <legend class="px-1">
            Scopes
          </legend>
          <label v-for="option of registrableScopes" :key="option.scope" class="flex items-start gap-2 mb-1">
            <input v-model="scopes" type="checkbox" :value="option.scope" class="mt-1">
            <span><code>{{ option.scope }}</code>: {{ option.description }}</span>
          </label>
        </fieldset>

        <fieldset class="border-none p-0 m-0">
          <legend class="mb-1">
            Browser origins
          </legend>
          <p class="text-muted text-sm mt-0">
            Regular expressions the whole origin has to match, like <code>https://(www\.)?example\.com</code>.
            None for a client that only calls from servers.
          </p>
          <div v-for="(_, index) of origins" :key="index" class="flex gap-2 mb-2">
            <label :for="`api-client-origin-${index}`" class="sr-only">
              Origin {{ index + 1 }}
            </label>
            <input
              :id="`api-client-origin-${index}`"
              v-model="origins[index]"
              type="text"
              required
              class="flex-1 min-w-48 block rounded border-line font-mono"
            >
            <button
              type="button"
              class="btn w-max"
              :aria-label="`Remove origin ${index + 1}`"
              @click="origins.splice(index, 1)"
            >
              <icon-delete aria-hidden="true" />
            </button>
          </div>
          <button type="button" class="btn w-max" @click="origins.push('')">
            Add origin
          </button>
        </fieldset>
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="saving" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import { useCreateApiClientMutation, useUpdateApiClientMutation } from '../graphql/generated/graphql'
import { registrableScopes, slugFromName } from '../helpers'

import IconDelete from '~icons/mdi/delete-outline'

import type { ApiClientRowFragment, Scope } from '../graphql/generated/graphql'

const { client = null } = defineProps<{
  /** The client being edited, or null to register a new one */
  client?: ApiClientRowFragment | null
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const clientId = ref(client?.id ?? '')
const idTouched = ref(client !== null)
const name = ref(client?.name ?? '')
const contact = ref(client?.contact ?? '')
const scopes = ref<Scope[]>([...client?.scopes ?? []])
const origins = ref<string[]>([...client?.origins ?? []])

const error = ref<string | null>(null)
const saving = ref(false)

function suggestId () {
  if (!idTouched.value) clientId.value = slugFromName(name.value)
}

const { mutate: createApiClient } = useCreateApiClientMutation({ throws: 'always', refetchQueries: ['ApiClients'] })
const { mutate: updateApiClient } = useUpdateApiClientMutation({ throws: 'always' })

async function save () {
  error.value = null
  saving.value = true
  try {
    const data = {
      name: name.value.trim(),
      contact: contact.value.trim() || null,
      scopes: scopes.value,
      origins: origins.value.map(origin => origin.trim())
    }
    if (client) await updateApiClient({ clientId: client.id, data })
    else await createApiClient({ clientId: clientId.value, data })
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
