<template>
  <dialog
    ref="dialog"
    aria-labelledby="video-dialog-title"
    class="bg-surface text-content border border-solid border-line rounded p-0 m-auto w-full max-w-120"
    @close="emit('close')"
  >
    <form class="p-4" @submit.prevent="submit()">
      <h2 id="video-dialog-title" class="mb-3">
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
              @blur="normaliseYouTubeInput()"
            >
          </template>
        </form-field>

        <form-field v-else id="video-file" label="Video file">
          <template #default="field">
            <input
              v-bind="field"
              ref="fileInput"
              type="file"
              accept="video/*"
              required
              class="w-full block"
              @change="pickFile($event)"
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
        <button
          type="button"
          class="rounded bg-surface border border-solid border-line px-3 py-2 cursor-pointer hover:bg-elevated"
          :disabled="busy"
          @click="close()"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="busy"
          class="rounded bg-ttred-500 text-white border-none px-3 py-2 cursor-pointer hover:bg-ttred-900 disabled:cursor-default disabled:bg-elevated disabled:text-muted"
        >
          {{ busy ? 'Adding…' : 'Add' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import FormField from './FormField.vue'
import { useAddTrickVideoMutation, useCreateTrickVideoUploadMutation, VideoType } from '../graphql/generated/graphql'
import { parseYouTubeId, videoTypeNames } from '../helpers'

const { trickId, open } = defineProps<{
  trickId: string
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  uploaded: []
}>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

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

function resetFields () {
  source.value = 'youtube'
  type.value = VideoType.SlowMo
  slowMoStart.value = ''
  youTubeInput.value = ''
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  progress.value = 0
  error.value = null
  youTubeError.value = null
}

watch(() => open, isOpen => {
  if (isOpen) {
    resetFields()
    dialog.value?.showModal()
  } else {
    dialog.value?.close()
  }
})

function close () {
  dialog.value?.close()
}

function pickFile (event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function normaliseYouTubeInput () {
  if (youTubeInput.value.trim() === '') {
    youTubeError.value = null
    return
  }

  const videoId = parseYouTubeId(youTubeInput.value)
  if (videoId === null) {
    youTubeError.value = 'This is neither a YouTube link nor a video ID'
    return
  }

  youTubeInput.value = videoId
  youTubeError.value = null
}

const slowMoStartValue = computed(() => {
  const seconds = Number.parseFloat(slowMoStart.value)
  return Number.isNaN(seconds) ? null : seconds
})

function errorMessage (err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong, please try again'
}

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
  if (videoId === null) {
    youTubeError.value = 'This is neither a YouTube link nor a video ID'
    return
  }
  youTubeError.value = null

  saving.value = true
  try {
    await addVideo({ trickId, data: { videoId, type: type.value, slowMoStart: slowMoStartValue.value } })
    close()
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
    const upload = created?.data?.createTrickVideoUpload
    if (upload?.url == null) throw new Error('The upload could not be started, please try again')

    saving.value = false
    uploading.value = true
    progress.value = 0
    await put(upload.url, video)

    emit('uploaded')
    close()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
    uploading.value = false
  }
}

async function submit () {
  if (busy.value) return
  error.value = null

  if (source.value === 'youtube') await addYouTubeVideo()
  else await uploadToMux()
}
</script>
