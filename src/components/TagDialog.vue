<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-160"
    @close="emit('close')"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save()">
      <h2 :id="titleId">
        {{ tag ? `Edit ${tag.name}` : 'New tag' }}
      </h2>

      <p v-if="tag?.system" class="text-muted">
        This tag is built in and holds the trick type, only its values and names can change.
      </p>

      <div class="grid sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label for="tag-name">English name</label>
          <input
            id="tag-name"
            v-model="name"
            type="text"
            required
            maxlength="60"
            class="rounded"
            @input="suggestId()"
          >
        </div>

        <div class="flex flex-col gap-1">
          <label for="tag-id">ID</label>
          <input
            id="tag-id"
            v-model="id"
            type="text"
            required
            maxlength="40"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            :readonly="tag !== null"
            :class="{ 'bg-sunken': tag !== null }"
            aria-describedby="tag-id-hint"
            class="rounded font-mono"
            @input="idTouched = true"
          >
          <p id="tag-id-hint" class="text-muted text-sm m-0">
            What search queries use, <code>#{{ id || 'id' }}</code>. It cannot change later.
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label for="tag-type">Type</label>
        <select id="tag-type" v-model="valueType" :disabled="locked" class="rounded w-max">
          <option v-for="(label, value) of tagValueTypeNames" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
        <p class="text-muted text-sm m-0">
          {{ typeHints[valueType] }}
        </p>
      </div>

      <fieldset class="border border-line rounded p-2" :disabled="locked">
        <legend class="px-1">
          Disciplines
        </legend>
        <div class="flex flex-wrap gap-4">
          <label v-for="(label, value) of disciplineNames" :key="value" class="flex items-center gap-2">
            <input v-model="disciplines" type="checkbox" :value="value">
            {{ label }}
          </label>
        </div>
        <p class="text-muted text-sm mt-1 mb-0">
          None picked means the tag applies to tricks of every discipline.
        </p>
      </fieldset>

      <div v-if="valueType !== TagValueType.Flag">
        <label class="flex items-center gap-2">
          <input v-model="required" type="checkbox" :disabled="locked" aria-describedby="tag-required-hint">
          Required
        </label>
        <p id="tag-required-hint" class="text-muted text-sm m-0">
          A trick of the tag's disciplines can't be created or have its tags changed without it. Tricks that
          don't have it yet are found with the tricks page's "Missing required tags" filter.
        </p>
      </div>

      <div v-if="valueType === TagValueType.Number" class="grid grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label for="tag-min">Minimum</label>
          <input id="tag-min" v-model="min" type="number" step="any" class="rounded">
        </div>
        <div class="flex flex-col gap-1">
          <label for="tag-max">Maximum</label>
          <input id="tag-max" v-model="max" type="number" step="any" class="rounded">
        </div>
        <div class="flex flex-col gap-1">
          <label for="tag-step">Step</label>
          <input
            id="tag-step"
            v-model="step"
            type="number"
            step="any"
            min="0"
            class="rounded"
          >
        </div>
        <p class="col-span-3 text-muted text-sm m-0">
          All optional. With a step, values are a whole number of steps from the minimum, or from 0 without one.
        </p>
      </div>

      <fieldset v-if="valueType === TagValueType.Enum" class="flex flex-col gap-2 border border-line rounded p-2">
        <legend class="px-1">
          Values
        </legend>

        <label class="flex items-center gap-2">
          <input v-model="multiple" type="checkbox" :disabled="locked">
          A trick may hold several of the values
        </label>

        <div v-for="(row, index) of values" :key="row.key" class="flex flex-wrap gap-2 items-end">
          <div class="flex flex-col gap-1 flex-1 min-w-36">
            <label :for="`tag-value-name-${row.key}`">English name</label>
            <input
              :id="`tag-value-name-${row.key}`"
              v-model="row.name"
              type="text"
              required
              maxlength="60"
              class="rounded w-full"
              @input="suggestValueId(row)"
            >
          </div>
          <div class="flex flex-col gap-1 flex-1 min-w-36">
            <label :for="`tag-value-id-${row.key}`">ID</label>
            <input
              :id="`tag-value-id-${row.key}`"
              v-model="row.id"
              type="text"
              required
              maxlength="40"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              :readonly="row.saved"
              :class="{ 'bg-sunken': row.saved }"
              class="rounded w-full font-mono"
              @input="row.idTouched = true"
            >
          </div>
          <div class="flex gap-1">
            <button
              type="button"
              class="btn w-max"
              :disabled="index === 0"
              :aria-label="`Move ${row.name || 'the value'} up`"
              @click="move(index, -1)"
            >
              <icon-arrow-up aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn w-max"
              :disabled="index === values.length - 1"
              :aria-label="`Move ${row.name || 'the value'} down`"
              @click="move(index, 1)"
            >
              <icon-arrow-down aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn w-max"
              :aria-label="`Remove ${row.name || 'the value'}`"
              @click="values.splice(index, 1)"
            >
              Remove
            </button>
          </div>
        </div>

        <button type="button" class="btn w-max" @click="addValue()">
          Add value
        </button>
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn w-max" @click="dialog?.close()">
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
import { computed, onMounted, ref, useId, useTemplateRef } from 'vue'
import { TagValueType, useCreateTagMutation, useUpdateTagMutation } from '../graphql/generated/graphql'
import { disciplineNames, parseNumber, slugFromName, tagValueTypeNames } from '../helpers'

import IconArrowUp from '~icons/mdi/arrow-up'
import IconArrowDown from '~icons/mdi/arrow-down'

import type { Discipline, TagDetailsFragment, TagInput } from '../graphql/generated/graphql'

interface ValueRow {
  key: number
  id: string
  name: string
  /** Saved, so its ID is fixed */
  saved: boolean
  idTouched: boolean
}

const { tag = null } = defineProps<{
  /** The tag being edited, or null to create a new one */
  tag?: TagDetailsFragment | null
}>()

const emit = defineEmits<{
  close: []
}>()

const typeHints: Record<TagValueType, string> = {
  [TagValueType.Flag]: 'A trick carries the tag or not, like #double-under.',
  [TagValueType.Number]: 'A trick holds a number, like #rope-turns:3.',
  [TagValueType.Enum]: 'A trick holds one of the values listed below, like #direction:forward.'
}

const dialog = useTemplateRef('dialog')
const titleId = useId()

const locked = computed(() => tag?.system === true)

let nextKey = 0

const id = ref(tag?.id ?? '')
const idTouched = ref(tag !== null)
const name = ref(tag?.name ?? '')
const valueType = ref(tag?.valueType ?? TagValueType.Flag)
const disciplines = ref<Discipline[]>([...tag?.disciplines ?? []])
const min = ref<string | number>(tag?.min ?? '')
const max = ref<string | number>(tag?.max ?? '')
const step = ref<string | number>(tag?.step ?? '')
const multiple = ref(tag?.multiple ?? false)
const required = ref(tag?.required ?? false)
const values = ref<ValueRow[]>(tag?.values.map(value => ({ key: nextKey++, id: value.id, name: value.name, saved: true, idTouched: true })) ?? [])

const error = ref<string | null>(null)
const saving = ref(false)

function suggestId () {
  if (!idTouched.value) id.value = slugFromName(name.value)
}

function suggestValueId (row: ValueRow) {
  if (!row.idTouched) row.id = slugFromName(row.name)
}

function addValue () {
  values.value.push({ key: nextKey++, id: '', name: '', saved: false, idTouched: false })
}

function move (index: number, by: number) {
  const [row] = values.value.splice(index, 1)
  values.value.splice(index + by, 0, row)
}

const { mutate: createTag } = useCreateTagMutation({ throws: 'always', refetchQueries: ['TagsWithCounts', 'Tags'] })
const { mutate: updateTag } = useUpdateTagMutation({ throws: 'always', refetchQueries: ['TagsWithCounts', 'Tags'] })

async function save () {
  error.value = null
  saving.value = true
  try {
    const isNumber = valueType.value === TagValueType.Number
    const isEnum = valueType.value === TagValueType.Enum
    const data: TagInput = {
      name: name.value,
      valueType: valueType.value,
      disciplines: disciplines.value,
      min: isNumber ? parseNumber(min.value) : null,
      max: isNumber ? parseNumber(max.value) : null,
      step: isNumber ? parseNumber(step.value) : null,
      multiple: isEnum ? multiple.value : null,
      values: isEnum ? values.value.map(row => ({ id: row.id, name: row.name })) : null,
      required: valueType.value !== TagValueType.Flag && required.value
    }
    await (tag ? updateTag({ tagId: tag.id, data }) : createTag({ tagId: id.value, data }))
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
