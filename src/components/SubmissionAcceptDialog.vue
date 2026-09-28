<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-4xl"
    @close="emit('close')"
    @cancel="event => { if (loading) event.preventDefault() }"
  >
    <form class="p-4" @submit.prevent="accept()">
      <h2 :id="titleId" class="mb-3">
        Accept “{{ submission.name }}”
      </h2>

      <fieldset :disabled="loading" class="border-none p-0 m-0">
        <div class="grid md:grid-cols-2 gap-x-4">
          <form-field id="accept-discipline" label="Discipline">
            <template #default="field">
              <select v-bind="field" v-model="discipline" class="w-full block rounded border-line">
                <option v-for="(label, value) of disciplineNames" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </template>
          </form-field>

          <video-type-fields v-model:type="videoType" v-model:slow-mo-start="slowMoStart" id-prefix="accept-video" />

          <form-field id="accept-slug" label="Slug" :error="slugError">
            <template #default="field">
              <input
                v-bind="field"
                v-model="slug"
                type="text"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                class="w-full block rounded focus:border-b-ttred-900 border-line"
                @input="slugEdited = true"
              >
            </template>
          </form-field>
        </div>

        <h3 class="mb-2 font-semibold">
          Tags
        </h3>
        <trick-tags-editor v-model="tags" :discipline="discipline" id-prefix="accept-tag" />

        <div class="grid lg:grid-cols-2 gap-x-8 mt-2">
          <h3 class="mb-2 font-semibold lg:col-start-1 lg:row-start-1">
            English
          </h3>
          <localisation-fields v-model="localisation" id-prefix="accept-en" lang="en" :column="1" />

          <template v-if="submitted">
            <h3 class="mb-2 font-semibold lg:col-start-2 lg:row-start-1">
              As submitted in {{ languageName(lang) }}
            </h3>
            <localisation-fields
              :model-value="submitted"
              readonly
              id-prefix="accept-submitted"
              :lang="lang"
              :column="2"
            />
          </template>
        </div>
      </fieldset>

      <p v-if="submitError" role="alert" class="text-ttred-900 mb-3">
        {{ submitError }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="loading" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="loading">
          {{ loading ? 'Creating trick…' : 'Create trick' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import FormField from './FormField.vue'
import LocalisationFields from './LocalisationFields.vue'
import TrickTagsEditor from './TrickTagsEditor.vue'
import VideoTypeFields from './VideoTypeFields.vue'
import { useAcceptTrickSubmissionMutation, VideoType } from '../graphql/generated/graphql'
import { disciplineNames, languageName, localisationInput, slowMoStartInput, slugFromName, toLocalisationValue } from '../helpers'
import useTags from '../hooks/useTags'

import type { TrickSubmissionRowFragment } from '../graphql/generated/graphql'
import type { TagRow } from '../helpers'

const { submission } = defineProps<{ submission: TrickSubmissionRowFragment }>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()
const { tagInputs } = useTags()

/** Only video submissions lack these */
const lang = submission.lang ?? 'en'
const text = { ...submission, name: submission.name ?? '' }

const discipline = ref(submission.discipline)
const tags = ref<TagRow[]>([])
const videoType = ref(VideoType.FullSpeed)
const slowMoStart = ref<string | number>(submission.video?.slowMoStart ?? '')
const localisation = ref(toLocalisationValue(lang === 'en' ? text : null))
const slug = ref(slugFromName(text.name))
const slugEdited = ref(false)

/** The submitter's own text, shown beside the English fields when it isn't English itself */
const submitted = lang === 'en' ? null : toLocalisationValue(text)

watch(() => localisation.value.name, name => {
  if (slugEdited.value) return
  slug.value = slugFromName(name)
})

const { mutate, loading, error } = useAcceptTrickSubmissionMutation({
  refetchQueries: ['TrickSubmissions', 'Tricks'],
  throws: 'never'
})

const slugTaken = computed(() => error.value?.graphQLErrors.some(err => err.extensions?.code === 'ENTITY_COLLISION') ?? false)
const slugError = computed(() => slugTaken.value ? 'A trick with this slug already exists in this discipline' : null)
const submitError = computed(() => slugTaken.value ? null : error.value?.message ?? null)

async function accept () {
  const result = await mutate({
    submissionId: submission.id,
    data: {
      discipline: discipline.value,
      slug: slug.value,
      tags: tagInputs(tags.value, discipline.value),
      localisation: localisationInput(localisation.value),
      videoType: videoType.value,
      slowMoStart: slowMoStartInput(videoType.value, slowMoStart.value)
    }
  })

  if (result?.data) dialog.value?.close()
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
