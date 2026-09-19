<template>
  <div>
    <h3 class="mb-1 font-semibold">
      {{ title }}
    </h3>
    <p class="text-muted text-sm mb-2">
      {{ hint }}
    </p>

    <div class="overflow-x-auto">
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
                class="btn w-max"
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
                <optgroup v-for="group of optionGroups" :key="group.label" :label="group.label">
                  <option v-for="option of group.options" :key="option.id" :value="option.id">
                    {{ option.name }}
                  </option>
                </optgroup>
              </select>
            </td>
            <td class="py-2">
              <button
                type="button"
                class="btn w-max"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface TrickRow {
  id: string
  name: string
}

interface TrickOption extends TrickRow {
  /** The trick's tricktionary level, absent when it has none */
  level?: string | null
}

const { title, hint, empty, addLabel, idPrefix, rows, options, editable } = defineProps<{
  title: string
  hint: string
  empty: string
  addLabel: string
  idPrefix: string
  rows: TrickRow[]
  options: TrickOption[]
  editable?: boolean
}>()

const emit = defineEmits<{
  add: [id: string]
  remove: [id: string]
}>()

const pick = ref('')

const optionGroups = computed(() => {
  const byLevel = new Map<string, TrickOption[]>()
  for (const option of options) {
    const level = option.level ?? ''
    const group = byLevel.get(level)
    if (group) group.push(option)
    else byLevel.set(level, [option])
  }

  return [...byLevel.entries()]
    .sort(([a], [b]) => {
      if (a === '' || b === '') return a === '' ? 1 : -1
      return a.localeCompare(b, undefined, { numeric: true })
    })
    .map(([level, group]) => ({
      label: level === '' ? 'No level' : `Level ${level}`,
      options: [...group].sort((a, b) => a.name.localeCompare(b.name))
    }))
})

function add () {
  if (pick.value === '') return
  emit('add', pick.value)
  pick.value = ''
}
</script>
