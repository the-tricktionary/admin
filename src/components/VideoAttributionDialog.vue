<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-sm"
    @close="emit('close')"
    @cancel="event => { if (saving) event.preventDefault() }"
  >
    <form class="p-4" @submit.prevent="save()">
      <h2 :id="titleId" class="mb-3">
        Edit video credit
      </h2>

      <fieldset :disabled="saving" class="border-none p-0 m-0">
        <form-field id="video-credit-name" label="Credited to (optional)">
          <template #default="field">
            <input
              v-bind="field"
              v-model="credit"
              type="text"
              maxlength="100"
              aria-describedby="video-credit-help"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            >
            <p id="video-credit-help" class="text-muted text-sm">
              The name shown in the trick's credits, leave empty for no credit
            </p>
          </template>
        </form-field>
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900 mb-3">
        {{ error }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
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
import FormField from './FormField.vue'
import { useSetTrickVideoAttributionMutation } from '../graphql/generated/graphql'
import { attributionInput } from '../helpers'

const { trickId, videoId, name } = defineProps<{
  trickId: string
  videoId: string
  /** The credit the video carries now, or null when it has none */
  name: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const credit = ref(name ?? '')
const error = ref<string | null>(null)
const saving = ref(false)

const { mutate: setAttribution } = useSetTrickVideoAttributionMutation({ throws: 'always' })

async function save () {
  error.value = null
  saving.value = true
  try {
    await setAttribution({ trickId, videoId, attribution: attributionInput(credit.value) })
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The credit could not be saved, please try again'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
