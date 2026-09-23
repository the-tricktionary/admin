<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-2xl"
    @close="emit('close')"
    @cancel="event => { if (busy) event.preventDefault() }"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save()">
      <h2 :id="titleId">
        {{ eventDefinition ? 'Edit event' : 'New event' }}
      </h2>

      <fieldset :disabled="busy" class="border-none p-0 m-0 min-w-0 flex flex-col gap-3">
        <form-field id="event-name" label="Name">
          <template #default="field">
            <input
              v-bind="field"
              v-model="name"
              type="text"
              required
              maxlength="120"
              placeholder="Single Rope Speed Sprint"
              class="w-full block rounded border-line"
            >
          </template>
        </form-field>

        <form-field id="event-duration" label="Duration (seconds, 0 for no time limit)">
          <template #default="field">
            <input
              v-bind="field"
              v-model.number="totalDuration"
              type="number"
              required
              min="0"
              max="3600"
              step="1"
              class="w-full block rounded border-line"
            >
          </template>
        </form-field>

        <form-field id="event-lookup-code" label="Rulesets lookup code (optional)">
          <template #default="field">
            <input
              v-bind="field"
              v-model="lookupCode"
              type="text"
              pattern="e\.[a-z0-9-]+\.(fs|sp|oa)\.(sr|dd|wh|ts|xd)\.[a-z0-9-]+\.[0-9]+\.([0-9]+x)?[0-9]+"
              placeholder="e.ijru.sp.sr.srss.1.30"
              class="w-full block rounded border-line font-mono"
            >
          </template>
        </form-field>

        <timing-track-editor
          ref="trackEditor"
          v-model:audio-url="audioUrl"
          v-model:cues="cues"
          :event-definition-id="eventDefinition?.id ?? null"
          :total-duration="totalDuration"
          @busy="uploading = $event"
        />
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="busy" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="busy">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from 'vue'
import FormField from './FormField.vue'
import TimingTrackEditor from './TimingTrackEditor.vue'
import { useCreateEventDefinitionMutation, useUpdateEventDefinitionMutation } from '../graphql/generated/graphql'

import type { CueRow } from '../helpers'
import type { EventDefinitionRowFragment } from '../graphql/generated/graphql'

const { eventDefinition = null } = defineProps<{
  /** The event being edited, or null to create a new one */
  eventDefinition?: EventDefinitionRowFragment | null
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const trackEditor = useTemplateRef('trackEditor')
const titleId = useId()

const name = ref(eventDefinition?.name ?? '')
const totalDuration = ref(eventDefinition?.totalDuration ?? 30)
const lookupCode = ref(eventDefinition?.eventDefinitionLookupCode ?? '')

/** null once the track has been removed, undefined while the event never had one */
const audioUrl = ref<string | null | undefined>(eventDefinition?.timingTrack?.audioUrl)
const cues = ref<CueRow[]>(eventDefinition?.timingTrack?.cues.map(cue => ({ type: cue.type, offset: cue.offset, label: cue.label ?? '' })) ?? [])

/** Cues alone are a track, the audio is optional */
const hasTrack = computed(() => typeof audioUrl.value === 'string' || cues.value.length > 0)

const error = ref<string | null>(null)
const saving = ref(false)
const uploading = ref(false)
const busy = computed(() => saving.value || uploading.value)

const { mutate: createEventDefinition } = useCreateEventDefinitionMutation({ throws: 'always', refetchQueries: ['EventDefinitions'] })
const { mutate: updateEventDefinition } = useUpdateEventDefinitionMutation({ throws: 'always', refetchQueries: ['EventDefinitions'] })

/** A track is its cues, which split the event, plus the audio they were placed against if any */
function timingTrackInput () {
  if (hasTrack.value) {
    return {
      timingTrack: {
        ...(audioUrl.value ? { audioUrl: audioUrl.value } : {}),
        cues: cues.value.map(cue => ({ type: cue.type, offset: Math.round(cue.offset), label: cue.label.trim() === '' ? null : cue.label.trim() }))
      }
    }
  }
  // nothing left of the track: clear the one the event had, leave the field alone otherwise
  if (eventDefinition?.timingTrack) return { timingTrack: null }
  return {}
}

async function save () {
  error.value = null
  saving.value = true
  try {
    const base = {
      name: name.value.trim(),
      totalDuration: totalDuration.value,
      lookupCode: lookupCode.value.trim() || null
    }
    if (eventDefinition) {
      await updateEventDefinition({ eventDefinitionId: eventDefinition.id, data: { ...base, ...timingTrackInput() } })
    } else {
      // An upload is scoped to an event that exists, so a new one is created
      // first, then its audio goes up, then the track is saved onto it.
      const created = await createEventDefinition({ data: base })
      const createdId = created?.data?.createEventDefinition.id
      if (!createdId) throw new Error('The event was not created, please try again')
      await trackEditor.value?.uploadPending(createdId)
      if (hasTrack.value) {
        await updateEventDefinition({ eventDefinitionId: createdId, data: { ...base, ...timingTrackInput() } })
      }
    }
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
