<template>
  <div class="container mx-auto pt-4 px-2">
    <div class="flex justify-between items-center gap-2 mb-4">
      <h1>API clients</h1>
      <button type="button" class="btn-primary w-max flex items-center gap-1" @click="openEditor(null)">
        <icon-plus aria-hidden="true" />
        New client
      </button>
    </div>

    <p class="text-muted mb-4">
      Whatever calls the API identifies itself with a key, and its scopes decide what it may reach. Keys are not
      secrets: the public site and the admin hand theirs to every browser, and the origins keep other sites from
      using them. The built in clients are defined in the API, only their keys change here.
    </p>

    <p v-if="loading && !clients.length">
      Loading API clients…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load API clients: {{ error.message }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-line text-left">
            <th scope="col" class="py-2 pr-2">
              Client
            </th>
            <th scope="col" class="py-2 pr-2">
              Scopes
            </th>
            <th scope="col" class="py-2 pr-2">
              Origins
            </th>
            <th scope="col" class="py-2 pr-2">
              Keys
            </th>
            <th scope="col" class="py-2 pr-2">
              Enabled
            </th>
            <th scope="col" class="py-2 pr-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client of clients" :key="client.id" class="border-b border-line">
            <td class="py-2 pr-2">
              {{ client.name }}
              <span class="block text-muted text-sm font-mono">{{ client.id }}</span>
              <span v-if="client.contact" class="block text-muted text-sm">{{ client.contact }}</span>
            </td>
            <td class="py-2 pr-2">
              <code v-for="scope of client.scopes" :key="scope" class="mr-1">{{ scope }}</code>
            </td>
            <td class="py-2 pr-2">
              <span v-if="!client.origins.length" class="text-muted">None</span>
              <code v-for="origin of client.origins" :key="origin" class="block text-sm">{{ origin }}</code>
            </td>
            <td class="py-2 pr-2">
              {{ client.keys.filter(key => key.revokedAt == null).length }} active
            </td>
            <td class="py-2 pr-2">
              <span v-if="client.builtIn" class="text-muted">Built in</span>
              <input
                v-else
                type="checkbox"
                :checked="client.enabled"
                :disabled="saving === client.id"
                :aria-label="`${client.name} may call the API`"
                @change="toggle(client, $event)"
              >
            </td>
            <td class="py-2 pr-2">
              <div class="flex gap-2">
                <button
                  v-if="!client.builtIn"
                  type="button"
                  class="btn w-max"
                  :aria-label="`Edit ${client.name}`"
                  @click="openEditor(client)"
                >
                  Edit
                </button>
                <button
                  v-if="client.id !== 'anonymous'"
                  type="button"
                  class="btn w-max"
                  :aria-label="`Keys of ${client.name}`"
                  @click="keysClientId = client.id"
                >
                  Keys
                </button>
              </div>
              <p v-if="errors.get(client.id)" role="alert" class="text-ttred-900 text-sm mt-1">
                {{ errors.get(client.id) }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <api-client-dialog
      v-if="editorOpen"
      :client="editorClient"
      @close="editorOpen = false"
    />
    <api-keys-dialog
      v-if="keysClient"
      :client="keysClient"
      @close="keysClientId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, reactive, ref } from 'vue'
import ApiClientDialog from '../components/ApiClientDialog.vue'
import ApiKeysDialog from '../components/ApiKeysDialog.vue'
import { useApiClientsQuery, useSetApiClientEnabledMutation } from '../graphql/generated/graphql'

import IconPlus from '~icons/mdi/plus'

import type { ApiClientRowFragment } from '../graphql/generated/graphql'

const { result, loading, error } = useApiClientsQuery({ fetchPolicy: 'cache-and-network' })
const clients = computed(() => result.value?.apiClients ?? [])

const editorClient = ref<ApiClientRowFragment | null>(null)
const editorOpen = ref(false)

// by ID, so the dialog shows the keys the query refetches
const keysClientId = ref<string | null>(null)
const keysClient = computed(() => clients.value.find(client => client.id === keysClientId.value) ?? null)

const saving = ref<string | null>(null)
const errors = reactive(new Map<string, string>())

const { mutate: setApiClientEnabled } = useSetApiClientEnabledMutation({ throws: 'always' })

function openEditor (client: ApiClientRowFragment | null) {
  editorClient.value = client
  editorOpen.value = true
}

async function toggle (client: ApiClientRowFragment, event: Event) {
  const checkbox = event.target as HTMLInputElement
  errors.delete(client.id)
  saving.value = client.id
  try {
    await setApiClientEnabled({ clientId: client.id, enabled: checkbox.checked })
  } catch (err) {
    // the query still holds the old value, so nothing would re-render the box
    checkbox.checked = client.enabled
    errors.set(client.id, err instanceof Error ? err.message : 'Something went wrong, please try again')
  } finally {
    saving.value = null
  }
}

useHead({ title: 'API clients' })
</script>
