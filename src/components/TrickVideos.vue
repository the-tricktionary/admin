<template>
  <div class="grid lg:grid-cols-2 gap-6">
    <div class="w-full aspect-video bg-placeholder isolate">
      <mux-preview
        v-if="selected?.host === VideoHost.Mux"
        :playback-id="selected.videoId"
        :title="title"
      />
      <iframe
        v-else-if="selected"
        class="w-full h-full border-none"
        :src="`https://www.youtube-nocookie.com/embed/${selected.videoId}`"
        :title="`${title} on YouTube`"
        allow="autoplay; picture-in-picture"
        allowfullscreen
      />
      <p v-else class="h-full flex items-center justify-center text-muted m-0">
        No videos yet
      </p>
    </div>

    <div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-solid border-line">
              <th scope="col" class="py-2 pr-2">
                Host
              </th>
              <th scope="col" class="py-2 pr-2">
                Type
              </th>
              <th scope="col" class="py-2 pr-2">
                Video ID
              </th>
              <th scope="col" class="py-2 pr-2">
                Slow motion start
              </th>
              <th scope="col" class="py-2 pr-2">
                Credited to
              </th>
              <th scope="col" class="py-2">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="video of videos" :key="video.videoId" class="border-b border-solid border-line">
              <td class="py-2 pr-2">
                {{ hostNames[video.host] }}
              </td>
              <td class="py-2 pr-2">
                {{ videoTypeNames[video.type] }}
              </td>
              <td class="py-2 pr-2">
                <code class="block max-w-40 truncate" :title="video.videoId">{{ video.videoId }}</code>
              </td>
              <td class="py-2 pr-2">
                {{ video.slowMoStart === null ? '–' : `${video.slowMoStart} s` }}
              </td>
              <td class="py-2 pr-2">
                {{ video.attribution?.name ?? '–' }}
              </td>
              <td class="py-2">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn w-max"
                    :aria-pressed="video.videoId === selected?.videoId"
                    :aria-label="`Preview ${videoTypeNames[video.type]} video ${video.videoId}`"
                    @click="preview = video.videoId"
                  >
                    Preview
                  </button>
                  <button
                    v-if="editable"
                    type="button"
                    class="btn w-max"
                    :disabled="removing === video.videoId"
                    :aria-label="`Remove ${videoTypeNames[video.type]} video ${video.videoId}`"
                    @click="remove(video.videoId)"
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!videos.length">
              <td colspan="6" class="py-2 text-muted">
                This trick has no videos yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="removeError" role="alert" class="text-ttred-900 mt-3">
        {{ removeError }}
      </p>

      <template v-if="pendingUploads.length">
        <h3 class="mt-4 mb-1 font-semibold">
          Uploads in progress
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-solid border-line">
                <th scope="col" class="py-2 pr-2">
                  Type
                </th>
                <th scope="col" class="py-2 pr-2">
                  Status
                </th>
                <th scope="col" class="py-2">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="upload of pendingUploads" :key="upload.id" class="border-b border-solid border-line">
                <td class="py-2 pr-2">
                  {{ videoTypeNames[upload.type] }}
                </td>
                <td class="py-2 pr-2">
                  {{ upload.status }}
                </td>
                <td class="py-2 text-ttred-900">
                  {{ upload.error ?? '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <button v-if="editable" type="button" class="btn w-max mt-4" @click="dialogOpen = true">
        Add video
      </button>

      <video-dialog
        v-if="dialogOpen"
        :trick-id="trickId"
        @close="dialogOpen = false"
        @uploaded="emit('refresh')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import MuxPreview from './MuxPreview.vue'
import VideoDialog from './VideoDialog.vue'
import { useRemoveTrickVideoMutation, VideoHost, VideoUploadStatus } from '../graphql/generated/graphql'
import { trickVideoTypes, videoTypeNames } from '../helpers'

import type { TrickQuery } from '../graphql/generated/graphql'

type LoadedTrick = NonNullable<TrickQuery['trick']>

const POLL_INTERVAL = 10_000

const settledStatuses: VideoUploadStatus[] = [VideoUploadStatus.Ready, VideoUploadStatus.Errored, VideoUploadStatus.Cancelled]

const hostNames: Record<VideoHost, string> = {
  [VideoHost.Mux]: 'Mux',
  [VideoHost.YouTube]: 'YouTube'
}

const { trickId, videos, pendingUploads, editable, title } = defineProps<{
  trickId: string
  videos: LoadedTrick['videos']
  pendingUploads: LoadedTrick['pendingVideoUploads']
  editable?: boolean
  title: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const preview = ref<string | null>(null)
const dialogOpen = ref(false)
const removing = ref<string | null>(null)
const removeError = ref<string | null>(null)

/** The public site's preference first, then whatever there is to preview */
const fallback = computed(() =>
  trickVideoTypes
    .map(type => videos.find(video => video.host === VideoHost.Mux && video.type === type))
    .find(video => video != null) ??
  videos.find(video => video.host === VideoHost.Mux) ??
  videos[0] ?? null
)

const selected = computed(() => videos.find(video => video.videoId === preview.value) ?? fallback.value)

const waitingOnMux = computed(() => pendingUploads.some(upload => !settledStatuses.includes(upload.status)))

const poll = useIntervalFn(() => { emit('refresh') }, POLL_INTERVAL, { immediate: false })

watch(waitingOnMux, waiting => {
  if (waiting) poll.resume()
  else poll.pause()
}, { immediate: true })

const { mutate: removeVideo } = useRemoveTrickVideoMutation({ throws: 'always' })

async function remove (videoId: string) {
  if (!window.confirm('Remove this video from the trick?')) return

  removing.value = videoId
  removeError.value = null

  try {
    await removeVideo({ trickId, videoId })
    if (preview.value === videoId) preview.value = null
  } catch (err) {
    removeError.value = err instanceof Error ? err.message : 'The video could not be removed, please try again'
  } finally {
    removing.value = null
  }
}
</script>
