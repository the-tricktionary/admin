<template>
  <div>
    <ul v-if="rows.length" class="list-none m-0 p-0 flex flex-col gap-2">
      <li
        v-for="(row, index) of rows"
        :key="row.tagId"
        class="border border-solid border-line rounded p-2 flex flex-wrap gap-x-4 gap-y-2 items-center"
      >
        <div class="flex-auto min-w-36">
          <span class="font-semibold">{{ tagsById.get(row.tagId)?.name ?? row.tagId }}</span>
          <span v-if="requiredOn(row.tagId, discipline)" class="text-muted text-sm"> (required)</span>
          <span class="block font-mono text-sm text-muted">#{{ row.tagId }}</span>
          <p v-if="!appliesTo(row.tagId, discipline)" class="text-ttred-900 text-sm m-0">
            Does not apply to {{ disciplineNames[discipline] }} tricks
          </p>
        </div>

        <template v-if="row.valueType === TagValueType.Number">
          <label :for="`${idPrefix}-number-${row.tagId}`" class="sr-only">{{ tagsById.get(row.tagId)?.name }}</label>
          <input
            :id="`${idPrefix}-number-${row.tagId}`"
            v-model="row.number"
            type="number"
            required
            :min="tagsById.get(row.tagId)?.min ?? undefined"
            :max="tagsById.get(row.tagId)?.max ?? undefined"
            :step="tagsById.get(row.tagId)?.step ?? 'any'"
            :disabled="disabled"
            class="w-32 rounded border-line disabled:bg-sunken"
          >
        </template>

        <template v-else-if="row.valueType === TagValueType.Enum && tagsById.get(row.tagId)?.multiple">
          <fieldset class="flex flex-wrap gap-x-4 border-0 p-0 m-0" :disabled="disabled">
            <legend class="sr-only">
              {{ tagsById.get(row.tagId)?.name }}
            </legend>
            <label v-for="value of tagsById.get(row.tagId)?.values ?? []" :key="value.id" class="flex items-center gap-1">
              <input v-model="row.values" type="checkbox" :value="value.id">
              {{ value.name }}
            </label>
          </fieldset>
        </template>

        <template v-else-if="row.valueType === TagValueType.Enum">
          <label :for="`${idPrefix}-value-${row.tagId}`" class="sr-only">{{ tagsById.get(row.tagId)?.name }}</label>
          <select
            :id="`${idPrefix}-value-${row.tagId}`"
            :value="row.values[0] ?? ''"
            required
            :disabled="disabled"
            class="w-max rounded border-line disabled:bg-sunken"
            @change="row.values = [($event.target as HTMLSelectElement).value]"
          >
            <option value="" disabled>
              Pick a value
            </option>
            <option v-for="value of tagsById.get(row.tagId)?.values ?? []" :key="value.id" :value="value.id">
              {{ value.name }}
            </option>
          </select>
        </template>

        <button
          v-if="!disabled && !requiredOn(row.tagId, discipline)"
          type="button"
          class="btn w-max"
          :aria-label="`Remove the ${tagsById.get(row.tagId)?.name ?? row.tagId} tag`"
          @click="rows.splice(index, 1)"
        >
          Remove
        </button>
      </li>
    </ul>
    <p v-else class="text-muted">
      No tags.
    </p>

    <div v-if="!disabled && addableTags.length" class="flex flex-wrap gap-2 items-end mt-2">
      <div>
        <label :for="`${idPrefix}-to-add`" class="block text-sm text-muted">Tag to add</label>
        <select :id="`${idPrefix}-to-add`" v-model="tagToAdd" class="w-max block rounded border-line">
          <option value="">
            Pick a tag
          </option>
          <option v-for="tag of addableTags" :key="tag.id" :value="tag.id">
            {{ tag.name }}
          </option>
        </select>
      </div>
      <button type="button" class="btn w-max" :disabled="tagToAdd === ''" @click="addTag(tagToAdd)">
        Add tag
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TagValueType } from '../graphql/generated/graphql'
import { disciplineNames } from '../helpers'
import useTags from '../hooks/useTags'

import type { Discipline } from '../graphql/generated/graphql'
import type { TagRow } from '../helpers'

const { discipline, disabled, idPrefix = 'tag' } = defineProps<{
  discipline: Discipline
  disabled?: boolean
  idPrefix?: string
}>()

const rows = defineModel<TagRow[]>({ required: true })

const { tags, tagsById, appliesTo, requiredOn } = useTags()

const addableTags = computed(() => tags.value.filter(tag => appliesTo(tag.id, discipline) && !rows.value.some(row => row.tagId === tag.id)))

const tagToAdd = ref('')

function addTag (tagId: string) {
  const tag = tagsById.value.get(tagId)
  if (!tag) return
  rows.value.push({ tagId, valueType: tag.valueType, number: '', values: [] })
  tagToAdd.value = ''
}

// the discipline's required tags are always there to fill in
watch([() => discipline, tags, rows], () => {
  for (const tag of tags.value) {
    if (requiredOn(tag.id, discipline) && !rows.value.some(row => row.tagId === tag.id)) addTag(tag.id)
  }
}, { immediate: true })
</script>
