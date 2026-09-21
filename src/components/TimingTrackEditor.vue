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
        <label class="file-picker" :for="fileInputId">Replace audio</label>
        <button type="button" class="btn w-max" @click="removeAudio()">
          Remove audio
        </button>
      </div>
    </template>

    <template v-else>
      <p class="text-muted mb-0">
        No audio. The cues below split the event on their own, upload the
        official audio to let athletes count along to it as well.
      </p>
      <label class="file-picker w-max" :for="fileInputId">Upload audio</label>
    </template>

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
              <select v-model="cue.type" :aria-label="`Type of cue ${index + 1}`" class="rounded min-w-24">
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
                class="rounded w-32 min-w-32"
                @change="cue.offset = Math.round(Number(($event.target as HTMLInputElement).value) * 1000)"
              >
            </td>
            <td class="py-1 pr-2">
              <input
                v-model="cue.label"
                type="text"
                maxlength="40"
                :placeholder="cueLabelPlaceholders[cue.type]"
                :aria-label="`Label of cue ${index + 1}`"
                class="rounded w-full min-w-40"
              >
            </td>
            <td class="py-1">
              <div class="flex gap-1">
                <button v-if="playableUrl" type="button" class="btn w-max" :aria-label="`Jump to cue ${index + 1}`" @click="seek(cue.offset)">
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

    <p class="text-muted text-sm mb-0">
      {{ cueHint }}
    </p>

    <div class="flex flex-wrap gap-2 items-center">
      <button v-if="playableUrl" type="button" class="btn w-max" @click="addCueAtPlayhead()">
        Add cue at playhead
      </button>
      <button type="button" class="btn w-max" @click="addSwitch()">
        Add switch
      </button>
      <button v-if="playableUrl || cues.length" type="button" class="btn w-max" @click="removeTrack()">
        Remove track
      </button>
    </div>

    <div class="flex flex-wrap gap-2 items-end">
      <div>
        <label :for="legsInputId" class="block text-sm text-muted mb-1">Legs</label>
        <input
          :id="legsInputId"
          v-model.number="legs"
          type="number"
          min="2"
          max="50"
          step="1"
          class="rounded w-20 block"
        >
      </div>

      <template v-if="playableUrl">
        <div>
          <label :for="startInputId" class="block text-sm text-muted mb-1">Start at (seconds)</label>
          <input
            :id="startInputId"
            v-model.number="startSeconds"
            type="number"
            min="0"
            step="0.001"
            class="rounded w-32 block"
          >
        </div>
        <button type="button" class="btn w-max" @click="startAtPlayhead()">
          At playhead
        </button>
      </template>

      <button type="button" class="btn w-max" :disabled="totalDuration <= 0" @click="splitEvenly()">
        Split evenly
      </button>
    </div>

    <p v-if="cueWarning" class="text-ttred-900 text-sm">
      {{ cueWarning }}
    </p>

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

const { eventDefinitionId, totalDuration } = defineProps<{
  /** Null while the event is being created: an upload has nothing to attach to yet */
  eventDefinitionId: string | null
  /** The event's duration in seconds, which is how long the cues have to fit in */
  totalDuration: number
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
const legsInputId = useId()
const startInputId = useId()
const player = useTemplateRef('player')

let nextKey = 0
const cues = ref<KeyedCueRow[]>(cuesModel.value.map(cue => ({ ...cue, key: nextKey++ })))
watch(cues, value => {
  cuesModel.value = value.map(({ type, offset, label }) => ({ type, offset, label }))
}, { deep: true })

const sortedCues = computed(() => [...cues.value].sort((a, b) => a.offset - b.offset))

/**
 * What an offset is measured from, which is the whole difference between the
 * two kinds of track: audio cues sit in the recording, cue-only ones in the
 * event itself.
 */
const cueHint = computed(() => {
  const lead = cues.value.length ? '' : 'No cues yet. '
  if (playableUrl.value) return `${lead}Play the track and add a cue at each signal: one start, one switch per athlete change, one end. Split evenly rebuilds all of them from the start you give it and the number of legs, keeping the labels.`
  return `${lead}Offsets are seconds from the go signal, and the event runs from zero to its duration: there is no end cue, and a start cue can only sit at zero to name the opening stretch. Split evenly rebuilds the cues for equal legs, keeping the labels.`
})

/** A start cue names the opening stretch, a switch the one it opens, an end cue names nothing */
const cueLabelPlaceholders: Record<TimingCueType, string> = {
  [TimingCueType.Start]: 'e.g. Athlete 1',
  [TimingCueType.Switch]: 'e.g. Athlete 2',
  [TimingCueType.End]: ''
}

/** Mirrors what the API accepts, so a bad cue is caught before saving */
const cueWarning = computed(() => {
  const starts = cues.value.filter(cue => cue.type === TimingCueType.Start)
  const ends = cues.value.filter(cue => cue.type === TimingCueType.End)
  const switches = cues.value.filter(cue => cue.type === TimingCueType.Switch)
  if (starts.length > 1) return 'A track can only have one start cue'
  if (ends.length > 1) return 'A track can only have one end cue'
  const start = starts[0]?.offset ?? -Infinity
  const end = ends[0]?.offset ?? Infinity
  if (start >= end) return 'The end cue must come after the start cue'
  if (switches.some(cue => cue.offset <= start || cue.offset >= end)) return 'Switch cues must lie between the start and end cues'
  if (!playableUrl.value) {
    if (ends.length) return 'Without audio the event ends at its total duration, so it has no end cue'
    if (starts.some(cue => cue.offset !== 0)) return 'Without audio the event starts at zero, so its start cue can only sit there to name the opening stretch'
    if (switches.some(cue => cue.offset < 1)) return 'A switch cannot happen before the event starts'
  }
  if (switches.length) {
    if (totalDuration <= 0) return 'Switch cues need a total duration'
    if (switches.some(cue => cue.offset - startOffset() >= totalDuration * 1000)) return 'Switch cues must fall inside the event, which ends a duration after the start cue'
  }
  // without audio the clock starts at the go signal, there is nothing to place a start cue against
  if (playableUrl.value && starts.length === 0) return 'Without a start cue the clock starts when playback starts, add one at the go signal'
  return null
})

/** Where the event begins, which without a start cue is where the audio does */
function startOffset () {
  return cues.value.find(cue => cue.type === TimingCueType.Start)?.offset ?? 0
}

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

/** A switch the admin times by hand, which is the only way to add one without audio */
function addSwitch () {
  cues.value.push({ key: nextKey++, type: TimingCueType.Switch, offset: 0, label: '' })
}

const legs = ref(4)

/** Where the split puts the go signal, which with audio is the lead-in the admin times */
const startSeconds = ref(startOffset() / 1000)

function startAtPlayhead () {
  startSeconds.value = Math.round((player.value?.currentTime ?? 0) * 1000) / 1000
}

/**
 * Times an evenly split relay in one go: it rebuilds the whole track from the
 * start, the duration and the number of legs, so every cue placed by hand is
 * replaced. A start cue names the opening stretch, a switch ends every leg but
 * the last, and with audio an end cue closes the event, which without audio
 * simply ends at its duration. The labels are carried over, switches by
 * position, so the athletes stay named.
 */
function splitEvenly () {
  const count = Math.round(legs.value)
  if (totalDuration <= 0 || !Number.isSafeInteger(count) || count < 2 || count > 50) return
  const start = playableUrl.value && Number.isFinite(startSeconds.value)
    ? Math.max(0, Math.round(startSeconds.value * 1000))
    : 0
  const duration = Math.round(totalDuration * 1000)
  const startLabel = cues.value.find(cue => cue.type === TimingCueType.Start)?.label ?? ''
  const endLabel = cues.value.find(cue => cue.type === TimingCueType.End)?.label ?? ''
  const switchLabels = cues.value
    .filter(cue => cue.type === TimingCueType.Switch)
    .sort((a, b) => a.offset - b.offset)
    .map(cue => cue.label)
  cues.value = [
    { key: nextKey++, type: TimingCueType.Start, offset: start, label: startLabel },
    ...Array.from({ length: count - 1 }, (_, index) => ({
      key: nextKey++,
      type: TimingCueType.Switch,
      offset: start + Math.round((index + 1) * duration / count),
      label: switchLabels[index] ?? ''
    })),
    ...(playableUrl.value
      ? [{ key: nextKey++, type: TimingCueType.End, offset: start + duration, label: endLabel }]
      : [])
  ]
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

/**
 * Drops the audio but keeps the cues, rebased on the go signal: an offset is
 * then measured from there, the event ends at its duration rather than at an
 * end cue, and only a labelled start cue is worth keeping, to name the opening
 * stretch.
 */
function removeAudio () {
  if (!window.confirm('Remove the audio? The file is deleted when you save, the cues are kept and measured from the go signal.')) return
  const start = cues.value.find(cue => cue.type === TimingCueType.Start)
  const offset = start?.offset ?? 0
  cues.value = [
    ...(start?.label ? [{ ...start, offset: 0 }] : []),
    ...cues.value
      .filter(cue => cue.type === TimingCueType.Switch)
      .map(cue => ({ ...cue, offset: cue.offset - offset }))
      .filter(cue => cue.offset >= 1)
  ]
  releasePending()
  audioUrl.value = null
}

function removeTrack () {
  const question = playableUrl.value ? 'Remove the timing track? The audio file is deleted when you save.' : 'Remove the cues?'
  if (!window.confirm(question)) return
  releasePending()
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
  wave: 'audio/wav',
  webm: 'audio/webm',
  flac: 'audio/flac'
}

/**
 * The other names browsers and operating systems give formats we already take:
 * a wav picked on Windows often arrives as audio/vnd.wave, an m4a as
 * audio/x-m4a. The file is uploaded under the name on the right, so what we
 * store is always the one a browser is happiest to play back.
 */
const TYPE_ALIASES: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/mpeg3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
  'audio/m4a': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'audio/x-aac': 'audio/aac',
  'audio/vnd.wave': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/x-pn-wav': 'audio/wav',
  'audio/x-flac': 'audio/flac'
}

/** Browsers sometimes leave the type blank, the extension is the next best guess */
function contentTypeOf (file: File) {
  const name = file.type
    ? file.type.split(';')[0].trim().toLowerCase()
    : EXTENSION_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? ''
  return TYPE_ALIASES[name] ?? name
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
