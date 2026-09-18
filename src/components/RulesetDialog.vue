<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-md"
    @close="emit('close')"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save()">
      <h2 :id="titleId">
        {{ ruleset ? 'Edit ruleset' : 'New ruleset' }}
      </h2>

      <div class="flex flex-col gap-1">
        <label for="ruleset-rules-id">Rules ID</label>
        <input
          id="ruleset-rules-id"
          v-model="rulesId"
          type="text"
          required
          pattern="[a-z0-9-]+(@[0-9]+(\.[0-9]+)*)?"
          placeholder="ijru@5.0.0"
          :readonly="ruleset !== null"
          :class="{ 'bg-sunken': ruleset !== null }"
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
            class="btn w-max"
            :aria-label="`Remove the ${row.lang || 'new'} name`"
            @click="names.splice(index, 1)"
          >
            Remove
          </button>
        </div>

        <button type="button" class="btn w-max" @click="names.push({ lang: '', value: '' })">
          Add language
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
          Save
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import { useCreateRulesetMutation, useUpdateRulesetMutation } from '../graphql/generated/graphql'

import type { RulesetsWithNamesQuery } from '../graphql/generated/graphql'

type Ruleset = RulesetsWithNamesQuery['rulesets'][number]

const { ruleset = null } = defineProps<{
  /** The ruleset being edited, or null to create a new one */
  ruleset?: Ruleset | null
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const rulesId = ref(ruleset?.id ?? '')
const names = ref(ruleset?.names.map(({ lang, value }) => ({ lang, value })) ?? [{ lang: 'en', value: '' }])
const error = ref<string | null>(null)
const saving = ref(false)

const { mutate: createRuleset } = useCreateRulesetMutation({ refetchQueries: ['RulesetsWithNames', 'Rulesets'] })
const { mutate: updateRuleset } = useUpdateRulesetMutation({ refetchQueries: ['RulesetsWithNames', 'Rulesets'] })

async function save () {
  error.value = null
  saving.value = true
  try {
    const variables = { rulesId: rulesId.value, names: names.value }
    await (ruleset ? updateRuleset(variables) : createRuleset(variables))
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
