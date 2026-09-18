<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content border border-solid border-line rounded p-0 m-auto w-full max-w-120"
    @close="emit('close')"
    @cancel="event => { if (busy) event.preventDefault() }"
  >
    <form class="p-4" @submit.prevent="submit()">
      <h2 :id="titleId" class="mb-3">
        Add video
      </h2>

      <fieldset :disabled="busy" class="border-none p-0 m-0">
        <form-field id="video-source" label="Source">
          <template #default="field">
            <select v-bind="field" v-model="source" class="w-full block rounded border-line">
              <option value="youtube">
                YouTube
              </option>
              <option value="mux">
                Upload to Mux
              </option>
            </select>
          </template>
        </form-field>

        <form-field id="video-type" label="Type">
          <template #default="field">
            <select v-bind="field" v-model="type" class="w-full block rounded border-line">
              <option v-for="(label, value) of videoTypeNames" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </template>
        </form-field>

        <form-field id="video-slow-mo-start" label="Slow motion start (seconds)">
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

        <form-field
          v-if="source === 'youtube'"
          id="video-youtube"
          label="YouTube link or video ID"
          :error="youTubeError"
        >
          <template #default="field">
            <input
              v-bind="field"
              v-model="youTubeInput"
              type="text"
              required
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
            >
          </template>
        </form-field>

        <form-field v-else id="video-file" label="Video file">
          <template #default="field">
            <input
              v-bind="field"
              type="file"
              accept="video/*"
              required
              class="w-full block"
              @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null"
            >
          </template>
        </form-field>
      </fieldset>

      <div v-if="uploading" class="mb-4">
        <label for="video-upload-progress" class="block mb-1">Uploading</label>
        <progress id="video-upload-progress" :value="progress" max="100" class="w-full block" />
      </div>

      <p v-if="error" role="alert" class="text-ttred-900 mb-3">
        {{ error }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="busy" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" :disabled="busy" class="btn-primary w-max">
          {{ busy ? 'Adding…' : 'Add' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from 'vue'
import FormField from './FormField.vue'
import { useAddTrickVideoMutation, useCreateTrickVideoUploadMutation, VideoType } from '../graphql/generated/graphql'
import { parseYouTubeId, videoTypeNames } from '../helpers'

const { trickId } = defineProps<{ trickId: string }>()

const emit = defineEmits<{
  close: []
  /** An upload was registered with the API, so the trick's pending uploads are stale */
  uploaded: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const source = ref<'mux' | 'youtube'>('youtube')
const type = ref<VideoType>(VideoType.SlowMo)
const slowMoStart = ref('')
const youTubeInput = ref('')
const file = ref<File | null>(null)

const saving = ref(false)
const uploading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)
const youTubeError = ref<string | null>(null)

const busy = computed(() => saving.value || uploading.value)

const { mutate: addVideo } = useAddTrickVideoMutation({ throws: 'always' })
const { mutate: createUpload } = useCreateTrickVideoUploadMutation({ throws: 'always' })

const slowMoStartValue = computed(() => {
  const seconds = Number.parseFloat(slowMoStart.value)
  return Number.isNaN(seconds) ? null : seconds
})

/** Mux hands out a URL that takes the file as the body of a single PUT */
async function put (url: string, video: File) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url)
    request.setRequestHeader('Content-Type', video.type)
    request.upload.addEventListener('progress', event => {
      if (event.lengthComputable) progress.value = Math.round(event.loaded / event.total * 100)
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) resolve()
      else reject(new Error(`The file could not be uploaded, Mux answered ${request.status}`))
    })
    request.addEventListener('error', () => { reject(new Error('The file could not be uploaded')) })
    request.addEventListener('abort', () => { reject(new Error('The upload was cancelled')) })
    request.send(video)
  })
}

async function addYouTubeVideo () {
  const videoId = parseYouTubeId(youTubeInput.value)
  youTubeError.value = videoId === null ? 'This is neither a YouTube link nor a video ID' : null
  if (videoId === null) return

  saving.value = true
  try {
    await addVideo({ trickId, data: { videoId, type: type.value, slowMoStart: slowMoStartValue.value } })
    dialog.value?.close()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

async function uploadToMux () {
  const video = file.value
  if (!video) {
    error.value = 'Pick a video file to upload'
    return
  }

  saving.value = true
  try {
    const created = await createUpload({ trickId, data: { type: type.value, slowMoStart: slowMoStartValue.value } })
    const url = created?.data?.createTrickVideoUpload.url
    if (url == null) throw new Error('The upload could not be started, please try again')
    // the API knows about the upload from here on, whether or not the file makes it
    emit('uploaded')

    saving.value = false
    uploading.value = true
    await put(url, video)
    dialog.value?.close()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
    uploading.value = false
  }
}

function errorMessage (err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong, please try again'
}

async function submit () {
  if (busy.value) return
  error.value = null

  if (source.value === 'youtube') await addYouTubeVideo()
  else await uploadToMux()
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
