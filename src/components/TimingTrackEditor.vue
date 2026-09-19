<template>
  <fieldset class="flex flex-col gap-3 border border-line rounded p-3">
    <legend class="px-1">
      Timing track
    </legend>

    <template v-if="playableUrl">
      <audio ref="player" :src="playableUrl" controls preload="metadata" class="w-full" />

      <p v-if="pendingFile" class="text-muted text-sm mb-0">
        {{ pendingFile.name }} is uploaded when you save the event.
      </p>

      <div class="flex flex-wrap gap-2 items-center">
        <button type="button" class="btn w-max" @click="addCueAtPlayhead()">
          Add cue at playhead
        </button>
        <label class="file-picker" :for="fileInputId">Replace audio</label>
        <button type="button" class="btn w-max" @click="removeTrack()">
          Remove track
        </button>
      </div>

      <div v-if="cues.length" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-line text-left text-sm text-muted">
              <th scope="col" class="py-1 pr-2">
                Type
              </th>
              <th scope="col" class="py-1 pr-2">
                Offset (seconds)
              </th>
              <th scope="col" class="py-1 pr-2">
                Label
              </th>
              <th scope="col" class="py-1">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(cue, index) of sortedCues" :key="cue.key" class="border-b border-line">
              <td class="py-1 pr-2">
                <select v-model="cue.type" :aria-label="`Type of cue ${index + 1}`" class="rounded">
                  <option v-for="(label, value) of timingCueTypeNames" :key="value" :value="value">
                    {{ label }}
                  </option>
                </select>
              </td>
              <td class="py-1 pr-2">
                <input
                  :value="(cue.offset / 1000).toFixed(3)"
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  :aria-label="`Offset of cue ${index + 1} in seconds`"
                  class="rounded w-32"
                  @change="cue.offset = Math.round(Number(($event.target as HTMLInputElement).value) * 1000)"
                >
              </td>
              <td class="py-1 pr-2">
                <input
                  v-model="cue.label"
                  type="text"
                  maxlength="40"
                  :placeholder="cue.type === TimingCueType.Switch ? 'e.g. Athlete 2' : ''"
                  :aria-label="`Label of cue ${index + 1}`"
                  class="rounded w-full"
                >
              </td>
              <td class="py-1">
                <div class="flex gap-1">
                  <button type="button" class="btn w-max" :aria-label="`Jump to cue ${index + 1}`" @click="seek(cue.offset)">
                    Jump
                  </button>
                  <button type="button" class="btn w-max" :aria-label="`Remove cue ${index + 1}`" @click="removeCue(cue)">
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-muted">
        No cues yet. Play the track and add a cue at each signal: one start, one
        switch per athlete change, one end.
      </p>
      <p v-if="cueWarning" class="text-ttred-900 text-sm">
        {{ cueWarning }}
      </p>
    </template>

    <template v-else>
      <p class="text-muted">
        No timing track. Upload the official audio of the event to let athletes
        count along to it.
      </p>
      <label class="file-picker w-max" :for="fileInputId">Upload audio</label>
    </template>

    <input
      :id="fileInputId"
      type="file"
      accept="audio/*"
      class="sr-only"
      @change="upload(($event.target as HTMLInputElement).files?.[0] ?? null)"
    >

    <div v-if="uploading">
      <label :for="`${fileInputId}-progress`" class="block mb-1">Uploading</label>
      <progress :id="`${fileInputId}-progress`" :value="progress" max="100" class="w-full block" />
    </div>
    <p v-if="uploadError" role="alert" class="text-ttred-900">
      {{ uploadError }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { TimingCueType, useCreateTimingTrackUploadMutation } from '../graphql/generated/graphql'
import { timingCueTypeNames } from '../helpers'

import type { CueRow } from '../helpers'

interface KeyedCueRow extends CueRow {
  key: number
}

const { eventDefinitionId } = defineProps<{
  /** Null while the event is being created: an upload has nothing to attach to yet */
  eventDefinitionId: string | null
}>()

/** null once the track has been removed, undefined while the event never had one */
const audioUrl = defineModel<string | null | undefined>('audioUrl', { required: true })
const cuesModel = defineModel<CueRow[]>('cues', { required: true })

const emit = defineEmits<{
  /** Whether an upload is in flight, so the dialog can hold off saving */
  busy: [busy: boolean]
}>()

/**
 * A file chosen before the event exists. It plays from a local object URL so
 * cues can be placed straight away, and goes up once saving has created the
 * event and given us an id to scope the upload to.
 */
const pendingFile = ref<File | null>(null)
const pendingUrl = ref<string | null>(null)
const playableUrl = computed(() => pendingUrl.value ?? audioUrl.value ?? null)

const fileInputId = useId()
const player = useTemplateRef('player')

let nextKey = 0
const cues = ref<KeyedCueRow[]>(cuesModel.value.map(cue => ({ ...cue, key: nextKey++ })))
watch(cues, value => {
  cuesModel.value = value.map(({ type, offset, label }) => ({ type, offset, label }))
}, { deep: true })

const sortedCues = computed(() => [...cues.value].sort((a, b) => a.offset - b.offset))

const cueWarning = computed(() => {
  const starts = cues.value.filter(cue => cue.type === TimingCueType.Start)
  const ends = cues.value.filter(cue => cue.type === TimingCueType.End)
  if (starts.length > 1) return 'A track can only have one start cue'
  if (ends.length > 1) return 'A track can only have one end cue'
  const start = starts[0]?.offset ?? -Infinity
  const end = ends[0]?.offset ?? Infinity
  if (start >= end) return 'The end cue must come after the start cue'
  if (cues.value.some(cue => cue.type === TimingCueType.Switch && (cue.offset <= start || cue.offset >= end))) return 'Switch cues must lie between the start and end cues'
  if (starts.length === 0) return 'Without a start cue the clock starts when playback starts, add one at the go signal'
  return null
})

/** The type the next cue most likely is: start first, then switches, then an end */
function nextCueType () {
  if (!cues.value.some(cue => cue.type === TimingCueType.Start)) return TimingCueType.Start
  if (cues.value.some(cue => cue.type === TimingCueType.End)) return TimingCueType.Switch
  return TimingCueType.Switch
}

function addCueAtPlayhead () {
  const offset = Math.round((player.value?.currentTime ?? 0) * 1000)
  cues.value.push({ key: nextKey++, type: nextCueType(), offset, label: '' })
}

function removeCue (cue: KeyedCueRow) {
  cues.value = cues.value.filter(other => other.key !== cue.key)
}

function seek (offset: number) {
  if (player.value) player.value.currentTime = offset / 1000
}

/** Keeps the file and plays it locally, so cues can be placed before saving */
function holdForSave (file: File) {
  releasePending()
  pendingFile.value = file
  pendingUrl.value = URL.createObjectURL(file)
}

function releasePending () {
  if (pendingUrl.value) URL.revokeObjectURL(pendingUrl.value)
  pendingUrl.value = null
  pendingFile.value = null
}

/**
 * Called by the dialog once the event has been created: the file finally has
 * an id to be scoped to, so it goes up and becomes the track's audio.
 */
async function uploadPending (newEventDefinitionId: string) {
  const file = pendingFile.value
  if (!file) return
  const contentType = contentTypeOf(file)
  if (!contentType) throw new Error('Could not tell what kind of audio this is')

  uploading.value = true
  progress.value = 0
  try {
    const created = await createUpload({ eventDefinitionId: newEventDefinitionId, contentType })
    const upload = created?.data?.createTimingTrackUpload
    if (!upload) throw new Error('The upload could not be started, please try again')
    await put(upload.url, file, contentType)
    audioUrl.value = upload.audioUrl
    releasePending()
  } finally {
    uploading.value = false
  }
}

defineExpose({ uploadPending })

function removeTrack () {
  releasePending()
  if (!window.confirm('Remove the timing track? The audio file is deleted when you save.')) return
  audioUrl.value = null
  cues.value = []
}

const uploading = ref(false)
const progress = ref(0)
const uploadError = ref<string | null>(null)

const { mutate: createUpload } = useCreateTimingTrackUploadMutation({ throws: 'always' })

const EXTENSION_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  flac: 'audio/flac'
}

/** Browsers sometimes leave the type blank, the extension is the next best guess */
function contentTypeOf (file: File) {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[extension] ?? ''
}

/** The signed URL takes the file as the body of a single PUT with the headers it was signed for */
async function put (url: string, file: File, contentType: string) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url)
    request.setRequestHeader('Content-Type', contentType)
    request.setRequestHeader('x-goog-content-length-range', `0,${50 * 1024 * 1024}`)
    request.upload.addEventListener('progress', event => {
      if (event.lengthComputable) progress.value = Math.round(event.loaded / event.total * 100)
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) resolve()
      else reject(new Error(`The file could not be uploaded, storage answered ${request.status}`))
    })
    request.addEventListener('error', () => { reject(new Error('The file could not be uploaded')) })
    request.addEventListener('abort', () => { reject(new Error('The upload was cancelled')) })
    request.send(file)
  })
}

async function upload (file: File | null) {
  if (!file) return
  uploadError.value = null
  const contentType = contentTypeOf(file)
  if (!contentType) {
    uploadError.value = 'Could not tell what kind of audio this is, use an mp3, m4a, ogg, wav, webm or flac file'
    return
  }

  if (eventDefinitionId == null) {
    holdForSave(file)
    return
  }

  uploading.value = true
  progress.value = 0
  emit('busy', true)
  try {
    const created = await createUpload({ eventDefinitionId, contentType })
    const upload = created?.data?.createTimingTrackUpload
    if (!upload) throw new Error('The upload could not be started, please try again')
    await put(upload.url, file, contentType)
    audioUrl.value = upload.audioUrl
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'The file could not be uploaded'
  } finally {
    uploading.value = false
    emit('busy', false)
  }
}

onBeforeUnmount(releasePending)
</script>

<style scoped>
/* not the btn class itself, an empty file input would otherwise grey it out via form:invalid */
.file-picker {
  @apply btn w-max;
}

/* the sr-only input is what takes focus, so its labels have to show the ring */
input:focus-visible ~ .file-picker,
input:focus-visible + .file-picker {
  @apply outline-2 outline-solid outline-ttred-900 outline-offset-2;
}
</style>
