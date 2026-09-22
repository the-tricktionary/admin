<template>
  <div class="container mx-auto pt-4 px-2 pb-8">
    <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
      <h1>Trick submissions</h1>
      <label class="flex items-center gap-2 text-sm whitespace-nowrap">
        Status
        <select v-model="status" class="rounded border-line py-1 text-sm w-max">
          <option value="">
            All
          </option>
          <option v-for="value of statuses" :key="value" :value="value">
            {{ value }}
          </option>
        </select>
      </label>
    </div>

    <p class="text-muted mb-4">
      The tricks people have offered through the public site. Accepting one
      creates the trick and credits the submitter on its video and its
      localisation, rejecting one deletes the video they uploaded.
    </p>

    <p v-if="loading && !submissions.length">
      Loading submissions…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load submissions: {{ error.message }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-solid border-line">
            <th scope="col" class="py-2 pr-2">
              Submitter
            </th>
            <th scope="col" class="py-2 pr-2">
              Credited to
            </th>
            <th scope="col" class="py-2 pr-2">
              Discipline
            </th>
            <th scope="col" class="py-2 pr-2">
              Name
            </th>
            <th scope="col" class="py-2 pr-2">
              Language
            </th>
            <th scope="col" class="py-2 pr-2">
              Submitted
            </th>
            <th scope="col" class="py-2 pr-2">
              Status
            </th>
            <th scope="col" class="py-2 pr-2">
              Video
            </th>
            <th scope="col" class="py-2">
              Review
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="submission of submissions" :key="submission.id">
            <tr class="border-b border-solid border-line">
              <td class="py-2 pr-2">
                {{ userLabel(submission.submitter) }}
              </td>
              <td class="py-2 pr-2">
                {{ submission.attributionName }}
              </td>
              <td class="py-2 pr-2">
                {{ disciplineNames[submission.discipline] }}
              </td>
              <td class="py-2 pr-2">
                <router-link
                  v-if="submission.trick"
                  :to="{ name: 'trick', params: { id: submission.trick.id } }"
                  :lang="submission.lang"
                >
                  {{ submission.name }}
                </router-link>
                <span v-else :lang="submission.lang">{{ submission.name }}</span>
              </td>
              <td class="py-2 pr-2">
                {{ languageLabel(submission.lang) }}
              </td>
              <td class="py-2 pr-2">
                {{ formatDate(submission.createdAt) }}
              </td>
              <td class="py-2 pr-2">
                {{ submission.status }}
              </td>
              <td class="py-2 pr-2">
                {{ videoState(submission) }}
                <p v-if="submission.upload.error" class="text-ttred-900 text-sm mt-1 mb-0">
                  {{ submission.upload.error }}
                </p>
              </td>
              <td class="py-2">
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="submission.video && submission.status !== TrickSubmissionStatus.Rejected"
                    type="button"
                    class="btn w-max"
                    :aria-pressed="preview === submission.id"
                    :aria-label="`Preview the video of ${submission.name}`"
                    @click="preview = preview === submission.id ? null : submission.id"
                  >
                    Preview
                  </button>
                  <template v-if="submission.status === TrickSubmissionStatus.Pending">
                    <button
                      type="button"
                      class="btn w-max"
                      :disabled="!submission.video"
                      :aria-describedby="submission.video ? undefined : `submission-waiting-${submission.id}`"
                      :aria-label="`Accept ${submission.name}`"
                      @click="accepting = submission"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      class="btn w-max"
                      :aria-label="`Reject ${submission.name}`"
                      @click="rejecting = submission"
                    >
                      Reject
                    </button>
                  </template>
                </div>
                <p
                  v-if="submission.status === TrickSubmissionStatus.Pending && !submission.video"
                  :id="`submission-waiting-${submission.id}`"
                  class="text-muted text-sm mt-1 mb-0"
                >
                  {{ waitingNote(submission) }}
                </p>
                <p v-if="submission.reviewNote" class="text-muted text-sm mt-1 mb-0">
                  {{ submission.reviewNote }}
                </p>
              </td>
            </tr>
            <tr v-if="preview === submission.id" class="border-b border-solid border-line">
              <td colspan="9" class="py-2">
                <div v-if="submission.video" class="w-full max-w-160 aspect-video bg-placeholder isolate">
                  <video-preview :playback-id="submission.video.videoId" :title="submission.name" />
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!submissions.length">
            <td colspan="9" class="py-2 text-muted">
              No submissions to show.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <submission-accept-dialog v-if="accepting" :submission="accepting" @close="accepting = null" />
    <submission-reject-dialog v-if="rejecting" :submission="rejecting" @close="rejecting = null" />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VideoPreview from '../components/VideoPreview.vue'
import SubmissionAcceptDialog from '../components/SubmissionAcceptDialog.vue'
import SubmissionRejectDialog from '../components/SubmissionRejectDialog.vue'
import { TrickSubmissionStatus, useTrickSubmissionsQuery, VideoUploadStatus } from '../graphql/generated/graphql'
import { disciplineNames, formatDate, languageLabel, userLabel } from '../helpers'

import type { TrickSubmissionRowFragment } from '../graphql/generated/graphql'

const statuses = Object.values(TrickSubmissionStatus)

/** Upload statuses no video will ever come out of */
const failedStatuses: VideoUploadStatus[] = [VideoUploadStatus.Errored, VideoUploadStatus.Cancelled]

const route = useRoute()
const router = useRouter()

/** Undefined drops the parameter, so the pending queue the view opens on leaves no trace in the URL */
function statusParam (value: TrickSubmissionStatus | '') {
  if (value === '') return 'all'
  return value === TrickSubmissionStatus.Pending ? undefined : value
}

/** Kept in the URL so the queue survives a reload and can be linked to */
const status = computed<TrickSubmissionStatus | ''>({
  get: () => {
    const value = route.query.status
    if (value === 'all') return ''
    return statuses.find(candidate => candidate === value) ?? TrickSubmissionStatus.Pending
  },
  set: value => {
    void router.replace({ query: { ...route.query, status: statusParam(value) } })
  }
})

const { result, loading, error } = useTrickSubmissionsQuery(
  () => ({ status: status.value === '' ? null : status.value }),
  { fetchPolicy: 'cache-and-network' }
)
const submissions = computed(() => result.value?.trickSubmissions ?? [])

const preview = ref<string | null>(null)
const accepting = ref<TrickSubmissionRowFragment | null>(null)
const rejecting = ref<TrickSubmissionRowFragment | null>(null)

/** What became of the uploaded file, the asset being deleted as the submission is rejected */
function videoState (submission: TrickSubmissionRowFragment) {
  if (submission.status === TrickSubmissionStatus.Rejected) return 'Deleted'
  return submission.video ? 'Ready' : submission.upload.status
}

function waitingNote (submission: TrickSubmissionRowFragment) {
  return failedStatuses.includes(submission.upload.status)
    ? 'The upload failed, so the submission can only be rejected.'
    : 'A submission can only be accepted once Mux has finished processing its video.'
}

useHead({ title: 'Trick submissions' })
</script>
