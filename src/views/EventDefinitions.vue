<template>
  <div class="container mx-auto pt-4 px-2">
    <div class="flex justify-between items-center gap-2 mb-4">
      <h1>Speed events</h1>
      <button type="button" class="btn-primary w-max" @click="openEditor(null)">
        New event
      </button>
    </div>

    <p class="text-muted mb-4">
      The events athletes can record speed scores against. A timing track is the
      official audio of an event, with cues for the start, the switches and the
      end, so the web app can play it while counting and attribute a relay's
      steps to each athlete.
    </p>

    <p v-if="loading && !eventDefinitions.length">
      Loading events…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load events: {{ error.message }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-line text-left">
            <th scope="col" class="py-2 pr-2">
              Name
            </th>
            <th scope="col" class="py-2 pr-2">
              Duration
            </th>
            <th scope="col" class="py-2 pr-2">
              Lookup code
            </th>
            <th scope="col" class="py-2 pr-2">
              Timing track
            </th>
            <th scope="col" class="py-2 pr-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="eventDefinition of eventDefinitions" :key="eventDefinition.id" class="border-b border-line">
            <td class="py-2 pr-2">
              {{ eventDefinition.name }}
            </td>
            <td class="py-2 pr-2">
              {{ formatDuration(eventDefinition.totalDuration) }}
            </td>
            <td class="py-2 pr-2 font-mono text-sm">
              {{ eventDefinition.eventDefinitionLookupCode ?? '' }}
            </td>
            <td class="py-2 pr-2">
              <template v-if="eventDefinition.timingTrack">
                {{ cueSummary(eventDefinition.timingTrack.cues) }}
              </template>
              <span v-else class="text-muted">None</span>
            </td>
            <td class="py-2 pr-2">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="btn w-max"
                  :aria-label="`Edit ${eventDefinition.name}`"
                  @click="openEditor(eventDefinition)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn w-max"
                  :disabled="deleting === eventDefinition.id"
                  :aria-label="`Delete ${eventDefinition.name}`"
                  @click="remove(eventDefinition)"
                >
                  Delete
                </button>
              </div>
              <p v-if="errors.get(eventDefinition.id)" role="alert" class="text-ttred-900 text-sm mt-1">
                {{ errors.get(eventDefinition.id) }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <event-definition-dialog
      v-if="dialogOpen"
      :event-definition="dialogEventDefinition"
      @close="dialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, reactive, ref } from 'vue'
import EventDefinitionDialog from '../components/EventDefinitionDialog.vue'
import { TimingCueType, useDeleteEventDefinitionMutation, useEventDefinitionsQuery } from '../graphql/generated/graphql'
import { formatDuration } from '../helpers'

import type { EventDefinitionRowFragment } from '../graphql/generated/graphql'

const { result, loading, error } = useEventDefinitionsQuery({ fetchPolicy: 'cache-and-network' })
const eventDefinitions = computed(() => result.value?.eventDefinitions ?? [])

const dialogEventDefinition = ref<EventDefinitionRowFragment | null>(null)
const dialogOpen = ref(false)

const deleting = ref<string | null>(null)
const errors = reactive(new Map<string, string>())

const { mutate: deleteEventDefinition } = useDeleteEventDefinitionMutation({ throws: 'always', refetchQueries: ['EventDefinitions'] })

type TimingCues = NonNullable<EventDefinitionRowFragment['timingTrack']>['cues']

function cueSummary (cues: TimingCues) {
  const switches = cues.filter(cue => cue.type === TimingCueType.Switch).length
  const hasStart = cues.some(cue => cue.type === TimingCueType.Start)
  const hasEnd = cues.some(cue => cue.type === TimingCueType.End)
  const parts = [
    hasStart ? 'start' : 'no start cue',
    switches === 1 ? '1 switch' : `${switches} switches`,
    hasEnd ? 'end' : 'no end cue'
  ]
  return parts.join(', ')
}

function openEditor (eventDefinition: EventDefinitionRowFragment | null) {
  dialogEventDefinition.value = eventDefinition
  dialogOpen.value = true
}

async function remove (eventDefinition: EventDefinitionRowFragment) {
  const confirmed = window.confirm(`Delete "${eventDefinition.name}"? This only works while no speed scores refer to it.`)
  if (!confirmed) return
  errors.delete(eventDefinition.id)
  deleting.value = eventDefinition.id
  try {
    await deleteEventDefinition({ eventDefinitionId: eventDefinition.id })
  } catch (err) {
    errors.set(eventDefinition.id, err instanceof Error ? err.message : 'The event could not be deleted')
  } finally {
    deleting.value = null
  }
}

useHead({ title: 'Speed events' })
</script>
