<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-2xl"
    @close="emit('close')"
    @cancel="event => { if (busy) event.preventDefault() }"
  >
    <div class="p-4 flex flex-col gap-3">
      <h2 :id="titleId">
        Keys of {{ client.name }}
      </h2>

      <p class="text-muted m-0">
        The API only stores a key's hash, and takes up to a minute to notice a new or revoked one.
      </p>

      <div v-if="issued" role="status" class="border border-line rounded p-2 flex flex-col gap-2">
        <label for="api-key-issued">Copy the new key now, it won't be shown again</label>
        <div class="flex gap-2">
          <input
            id="api-key-issued"
            :value="issued"
            readonly
            class="flex-1 min-w-48 rounded font-mono"
            @focus="selectAll"
          >
          <button type="button" class="btn w-max" @click="copy()">
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <p v-if="client.builtIn" class="text-muted text-sm m-0">
          The app gets it through <code>api_keys</code> in the infra repository.
        </p>
      </div>

      <p v-if="!client.keys.length" class="m-0">
        No keys yet.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-line text-left">
              <th scope="col" class="py-2 pr-2">
                Key
              </th>
              <th scope="col" class="py-2 pr-2">
                Issued
              </th>
              <th scope="col" class="py-2 pr-2">
                Status
              </th>
              <th scope="col" class="py-2 pr-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key of client.keys" :key="key.id" class="border-b border-line">
              <td class="py-2 pr-2 font-mono">
                {{ key.hint }}…
              </td>
              <td class="py-2 pr-2">
                {{ formatDate(key.createdAt) }}
              </td>
              <td class="py-2 pr-2">
                {{ key.revokedAt == null ? 'Active' : `Revoked ${formatDate(key.revokedAt)}` }}
              </td>
              <td class="py-2 pr-2">
                <button
                  v-if="key.revokedAt == null"
                  type="button"
                  class="btn w-max"
                  :disabled="busy"
                  :aria-label="`Revoke ${key.hint}…`"
                  @click="revoke(key)"
                >
                  Revoke
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" role="alert" class="text-ttred-900 m-0">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="busy" @click="dialog?.close()">
          Close
        </button>
        <button type="button" class="btn-primary w-max" :disabled="busy" @click="issue()">
          Issue key
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import { useIssueApiKeyMutation, useRevokeApiKeyMutation } from '../graphql/generated/graphql'
import { formatDate } from '../helpers'

import type { ApiClientRowFragment, ApiKeyRowFragment } from '../graphql/generated/graphql'

const { client } = defineProps<{
  client: ApiClientRowFragment
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const issued = ref<string | null>(null)
const copied = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

const { mutate: issueApiKey } = useIssueApiKeyMutation({ throws: 'always', refetchQueries: ['ApiClients'] })
const { mutate: revokeApiKey } = useRevokeApiKeyMutation({ throws: 'always' })

async function run (action: () => Promise<void>) {
  error.value = null
  busy.value = true
  try {
    await action()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    busy.value = false
  }
}

async function issue () {
  await run(async () => {
    const result = await issueApiKey({ clientId: client.id })
    issued.value = result?.data?.issueApiKey.key ?? null
    copied.value = false
  })
}

async function revoke (key: ApiKeyRowFragment) {
  if (!window.confirm(`Revoke ${key.hint}…? Whatever uses it stops working.`)) return
  await run(async () => { await revokeApiKey({ keyId: key.id }) })
}

async function copy () {
  if (issued.value == null) return
  await navigator.clipboard.writeText(issued.value)
  copied.value = true
}

function selectAll (event: FocusEvent) {
  (event.target as HTMLInputElement).select()
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
