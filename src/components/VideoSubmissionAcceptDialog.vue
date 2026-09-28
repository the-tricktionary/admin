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
        <form-field id="accept-video-type" label="Video type">
          <template #default="field">
            <select v-bind="field" v-model="videoType" class="w-full block rounded border-line">
              <option v-for="(label, value) of videoTypeNames" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </template>
        </form-field>

        <form-field
          v-if="videoType === VideoType.SlowMo"
          id="accept-slow-mo-start"
          label="Slow motion start (seconds)"
        >
          <template #default="field">
            <input
              v-bind="field"
              v-model="slowMoStart"
              type="number"
              min="0"
              step="0.1"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            >
          </template>
        </form-field>
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
import { computed, onMounted, ref, useId, useTemplateRef } from 'vue'
import FormField from './FormField.vue'
import { useAcceptTrickVideoSubmissionMutation, VideoType } from '../graphql/generated/graphql'
import { parseNumber, submissionLabel, videoTypeNames } from '../helpers'

import type { TrickSubmissionRowFragment } from '../graphql/generated/graphql'

const { submission } = defineProps<{ submission: TrickSubmissionRowFragment }>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const videoType = ref(VideoType.FullSpeed)
const slowMoStart = ref('')

const { mutate, loading, error } = useAcceptTrickVideoSubmissionMutation({
  refetchQueries: ['TrickSubmissions'],
  throws: 'never'
})

const slowMoStartValue = computed(() => videoType.value === VideoType.SlowMo ? parseNumber(slowMoStart.value) : null)

async function accept () {
  const result = await mutate({
    submissionId: submission.id,
    data: {
      videoType: videoType.value,
      slowMoStart: slowMoStartValue.value
    }
  })

  if (result?.data) dialog.value?.close()
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
