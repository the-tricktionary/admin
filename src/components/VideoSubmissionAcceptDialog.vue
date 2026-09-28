<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-120"
    @close="emit('close')"
    @cancel="event => { if (loading) event.preventDefault() }"
  >
    <form class="p-4" @submit.prevent="accept()">
      <h2 :id="titleId" class="mb-3">
        Accept “{{ submissionLabel(submission) }}”
      </h2>

      <p class="text-muted mb-3">
        The video is added after the trick's other videos, credited to
        {{ submission.attributionName }}. Change the order on the trick's page.
      </p>

      <fieldset :disabled="loading" class="border-none p-0 m-0">
        <video-type-fields v-model:type="type" v-model:slow-mo-start="slowMoStart" id-prefix="accept-video" />
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900 mb-3">
        {{ error.message }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="loading" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="loading">
          {{ loading ? 'Adding video…' : 'Add video' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import VideoTypeFields from './VideoTypeFields.vue'
import { useAcceptTrickVideoSubmissionMutation, VideoType } from '../graphql/generated/graphql'
import { slowMoStartInput, submissionLabel } from '../helpers'

import type { TrickSubmissionRowFragment } from '../graphql/generated/graphql'

const { submission } = defineProps<{ submission: TrickSubmissionRowFragment }>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const type = ref(VideoType.FullSpeed)
const slowMoStart = ref<string | number>('')

const { mutate, loading, error } = useAcceptTrickVideoSubmissionMutation({
  refetchQueries: ['TrickSubmissions'],
  throws: 'never'
})

async function accept () {
  const result = await mutate({
    submissionId: submission.id,
    data: {
      type: type.value,
      slowMoStart: slowMoStartInput(type.value, slowMoStart.value)
    }
  })

  if (result?.data) dialog.value?.close()
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
