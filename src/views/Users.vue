<template>
  <div class="container mx-auto pt-4 px-2">
    <h1>Users</h1>

    <form class="flex flex-wrap gap-2 items-end my-4" @submit.prevent="search()">
      <div class="flex-auto max-w-120">
        <label for="user-search" class="block text-sm text-muted">
          Email, username or user ID
        </label>
        <input
          id="user-search"
          v-model="term"
          type="search"
          placeholder="someone@example.com"
          class="w-full rounded"
        >
      </div>
      <button type="submit" class="btn-primary w-max">
        Search
      </button>
      <button v-if="searched !== ''" type="button" class="btn w-max" @click="showAll()">
        Show all
      </button>
    </form>

    <p v-if="error" role="alert" class="text-ttred-900">
      The users could not be loaded: {{ error.message }}
    </p>

    <p v-if="loading && !users">
      Loading users…
    </p>
    <template v-else-if="users">
      <div v-if="users.length" class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-solid border-line">
              <th scope="col" class="p-2">
                Name
              </th>
              <th scope="col" class="p-2">
                Email
              </th>
              <th scope="col" class="p-2">
                Username
              </th>
              <th scope="col" class="p-2">
                ID
              </th>
              <th scope="col" class="p-2">
                Grants
              </th>
              <th scope="col" class="p-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user of users" :key="user.id" class="border-b border-solid border-line">
              <td class="p-2">
                <span class="flex items-center gap-2 whitespace-nowrap">
                  <img
                    v-if="user.photo"
                    :src="user.photo"
                    alt=""
                    width="24"
                    height="24"
                    class="rounded-full bg-placeholder"
                  >
                  {{ user.name ?? '–' }}
                </span>
              </td>
              <td class="p-2 whitespace-nowrap">
                {{ user.email ?? '–' }}
              </td>
              <td class="p-2 whitespace-nowrap">
                {{ user.username ?? '–' }}
              </td>
              <td class="p-2 whitespace-nowrap font-mono text-sm">
                {{ user.id }}
              </td>
              <td class="p-2 text-sm">
                <grant-summary :grants="user.grants" />
              </td>
              <td class="p-2">
                <button
                  type="button"
                  class="btn w-max whitespace-nowrap"
                  @click="editingId = user.id"
                >
                  Edit grants
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>
        {{ searched === '' ? 'Nobody has any grants yet' : 'No users found' }}
      </p>
    </template>

    <user-grants-editor
      v-if="editingUser"
      :key="editingUser.id"
      :user="editingUser"
      @close="editingId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref } from 'vue'
import GrantSummary from '../components/GrantSummary.vue'
import UserGrantsEditor from '../components/UserGrantsEditor.vue'
import { useFindUsersQuery } from '../graphql/generated/graphql'

const term = ref('')
const searched = ref('')
const editingId = ref<string | null>(null)

const { result, loading, error, restart } = useFindUsersQuery(
  () => ({ query: searched.value === '' ? null : searched.value }),
  { fetchPolicy: 'cache-and-network' }
)

const users = computed(() => result.value?.findUsers)
const editingUser = computed(() => users.value?.find(user => user.id === editingId.value) ?? null)

function search () {
  const next = term.value.trim()
  editingId.value = null
  // the same term twice over is a deliberate re-read rather than a no-op
  if (next === searched.value) restart()
  else searched.value = next
}

/** Back to every user that has a grant */
function showAll () {
  term.value = ''
  search()
}

useHead({ title: 'Users' })
</script>
