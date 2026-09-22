<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-120"
    @close="emit('close')"
    @cancel="event => { if (loading) event.preventDefault() }"
  >
    <form class="p-4" @submit.prevent="reject()">
      <h2 :id="titleId" class="mb-3">
        Reject “{{ submission.name }}”
      </h2>

      <p class="text-muted mb-3">
        The uploaded video is deleted and the submitter sees the note on their profile.
      </p>

      <fieldset :disabled="loading" class="border-none p-0 m-0">
        <form-field id="reject-note" label="Note to the submitter (optional)">
          <template #default="field">
            <textarea
              v-bind="field"
              v-model="note"
              rows="3"
              maxlength="500"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            />
          </template>
        </form-field>
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900 mb-3">
        {{ error }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="loading" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="loading">
          {{ loading ? 'Rejecting…' : 'Reject' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import FormField from './FormField.vue'
import { useRejectTrickSubmissionMutation } from '../graphql/generated/graphql'

import type { TrickSubmissionRowFragment } from '../graphql/generated/graphql'

const { submission } = defineProps<{ submission: TrickSubmissionRowFragment }>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const note = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

const { mutate: rejectSubmission } = useRejectTrickSubmissionMutation({ throws: 'always', refetchQueries: ['TrickSubmissions'] })

async function reject () {
  error.value = null
  loading.value = true
  try {
    await rejectSubmission({ submissionId: submission.id, note: note.value.trim() === '' ? null : note.value.trim() })
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The submission could not be rejected, please try again'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
