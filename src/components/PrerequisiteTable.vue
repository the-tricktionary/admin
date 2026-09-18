<template>
  <div>
    <h3 class="mb-1 font-semibold">
      {{ title }}
    </h3>
    <p class="text-muted text-sm mb-2">
      {{ hint }}
    </p>

    <table class="w-full border-collapse text-left">
      <tbody>
        <tr v-for="row of rows" :key="row.id" class="border-b border-solid border-line">
          <td class="py-2 pr-2 w-full">
            <router-link :to="{ name: 'trick', params: { id: row.id } }" class="text-link hover:text-link-hover">
              {{ row.name }}
            </router-link>
          </td>
          <td v-if="editable" class="py-2">
            <button
              type="button"
              class="rounded bg-surface border border-solid border-line px-3 py-1 cursor-pointer hover:bg-elevated whitespace-nowrap"
              :aria-label="`Remove ${row.name} from ${title.toLowerCase()}`"
              @click="emit('remove', row.id)"
            >
              Remove
            </button>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td class="py-2 text-muted" :colspan="editable ? 2 : 1">
            {{ empty }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="editable">
        <tr>
          <td class="py-2 pr-2">
            <label :for="`${idPrefix}-add`" class="sr-only">{{ addLabel }}</label>
            <select :id="`${idPrefix}-add`" v-model="pick" class="w-full block rounded border-line">
              <option value="">
                Pick a trick
              </option>
              <option v-for="option of options" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </td>
          <td class="py-2">
            <button
              type="button"
              class="rounded bg-surface border border-solid border-line px-3 py-1 cursor-pointer hover:bg-elevated whitespace-nowrap disabled:cursor-default disabled:bg-elevated disabled:text-muted"
              :disabled="pick === ''"
              @click="add()"
            >
              Add
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TrickRow {
  id: string
  name: string
}

const { title, hint, empty, addLabel, idPrefix, rows, options, editable } = defineProps<{
  title: string
  hint: string
  /** What to say in place of the rows when there are none */
  empty: string
  addLabel: string
  idPrefix: string
  rows: TrickRow[]
  options: TrickRow[]
  editable?: boolean
}>()

const emit = defineEmits<{
  add: [id: string]
  remove: [id: string]
}>()

const pick = ref('')

function add () {
  if (pick.value === '') return
  emit('add', pick.value)
  pick.value = ''
}
</script>
