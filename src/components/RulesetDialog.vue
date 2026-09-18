<template>
  <dialog
    ref="dialogRef"
    class="bg-surface text-content rounded border border-line p-0 w-full max-w-md"
    @close="onDialogClose"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save">
      <h2>{{ isEdit ? 'Edit ruleset' : 'New ruleset' }}</h2>

      <div class="flex flex-col gap-1">
        <label for="ruleset-rules-id">Rules ID</label>
        <input
          id="ruleset-rules-id"
          v-model="rulesId"
          type="text"
          required
          pattern="[a-z0-9-]+(@[0-9]+(\.[0-9]+)*)?"
          placeholder="ijru@5.0.0"
          :readonly="isEdit"
          :class="{ 'bg-sunken': isEdit }"
          class="rounded"
        >
      </div>

      <fieldset class="flex flex-col gap-2 border border-line rounded p-2">
        <legend class="px-1">
          Names
        </legend>

        <div v-for="(row, index) in names" :key="index" class="flex gap-2 items-end">
          <div class="flex flex-col gap-1">
            <label :for="`ruleset-lang-${index}`">Language</label>
            <input
              :id="`ruleset-lang-${index}`"
              v-model="row.lang"
              type="text"
              required
              pattern="[a-z]{2,3}(-[a-z0-9]{2,8})*"
              :readonly="index === 0"
              :class="{ 'bg-sunken': index === 0 }"
              class="rounded w-24"
            >
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label :for="`ruleset-value-${index}`">Name</label>
            <input
              :id="`ruleset-value-${index}`"
              v-model="row.value"
              type="text"
              required
              class="rounded w-full"
            >
          </div>
          <button
            v-if="index > 0"
            type="button"
            class="rounded bg-surface border border-line px-3 py-1"
            @click="removeLanguage(index)"
          >
            Remove
          </button>
        </div>

        <button
          type="button"
          class="rounded bg-surface border border-line px-3 py-1 self-start"
          @click="addLanguage"
        >
          Add language
        </button>
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="rounded bg-surface border border-line px-3 py-1" @click="closeDialog">
          Cancel
        </button>
        <button type="submit" class="rounded bg-ttred-500 text-white px-3 py-1" :disabled="saving">
          Save
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCreateRulesetMutation, useUpdateRulesetMutation } from '../graphql/generated/graphql'

import type { RulesetsWithNamesQuery } from '../graphql/generated/graphql'

type Ruleset = RulesetsWithNamesQuery['rulesets'][number]

interface NameRow {
  lang: string
  value: string
}

const { ruleset = null, open } = defineProps<{
  /** The ruleset being edited, or null to create a new one */
  ruleset?: Ruleset | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const dialogRef = ref<HTMLDialogElement>()
const rulesId = ref('')
const names = ref<NameRow[]>([{ lang: 'en', value: '' }])
const error = ref<string | null>(null)
const saving = ref(false)

const isEdit = computed(() => ruleset !== null)

const { mutate: createRuleset } = useCreateRulesetMutation({
  refetchQueries: ['RulesetsWithNames']
})
const { mutate: updateRuleset } = useUpdateRulesetMutation({
  refetchQueries: ['RulesetsWithNames']
})

function resetFields () {
  rulesId.value = ruleset?.id ?? ''
  names.value = ruleset
    ? ruleset.names.map(name => ({ lang: name.lang, value: name.value }))
    : [{ lang: 'en', value: '' }]
  error.value = null
}

watch(() => open, isOpen => {
  if (isOpen) {
    resetFields()
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
})

function closeDialog () {
  dialogRef.value?.close()
}

function onDialogClose () {
  emit('close')
}

function addLanguage () {
  names.value.push({ lang: '', value: '' })
}

function removeLanguage (index: number) {
  names.value.splice(index, 1)
}

async function save () {
  error.value = null
  saving.value = true
  try {
    const variables = {
      rulesId: rulesId.value,
      names: names.value.map(({ lang, value }) => ({ lang, value }))
    }
    if (isEdit.value) {
      await updateRuleset(variables)
    } else {
      await createRuleset(variables)
    }
    closeDialog()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    saving.value = false
  }
}
</script>
