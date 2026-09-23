<template>
  <div class="container mx-auto pt-4 px-2 pb-24">
    <div v-if="loading && !trick" class="flex items-center justify-center flex-col" role="status">
      <icon-loading class="animate-spin w-32 h-32" aria-hidden="true" />
      Loading trick...
    </div>

    <p v-else-if="error" class="text-ttred-900" role="alert">
      The trick could not be loaded: {{ error.message }}
    </p>

    <p v-else-if="!trick">
      There is no trick with the id <code>{{ trickId }}</code>.
    </p>

    <template v-else>
      <h1>{{ trick.en?.name ?? trick.slug }}</h1>

      <form id="trick-editor" @submit.prevent="save()">
        <section class="mt-6">
          <h2 class="mb-2">
            Details
          </h2>

          <dl v-if="!canEditTricks" class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
            <dt>Discipline</dt>
            <dd>
              {{ disciplineNames[form.discipline] }}
            </dd>
            <dt>Trick type</dt>
            <dd>
              {{ trickTypeLabel(form.trickType) }}
            </dd>
            <dt>Tricktionary level</dt>
            <dd>
              {{ form.levels[TRICKTIONARY] || 'No level' }}
            </dd>
            <dt>Slug</dt>
            <dd>
              {{ form.slug }}
            </dd>
          </dl>

          <div v-else class="grid md:grid-cols-2 gap-x-4">
            <form-field id="discipline" label="Discipline">
              <template #default="field">
                <select v-bind="field" v-model="form.discipline" class="w-full block rounded border-line">
                  <option v-for="(label, value) of disciplineNames" :key="value" :value="value">
                    {{ label }}
                  </option>
                </select>
              </template>
            </form-field>

            <form-field id="trick-type" label="Trick type">
              <template #default="field">
                <select v-bind="field" v-model="form.trickType" class="w-full block rounded border-line">
                  <option v-for="type of trickTypes" :key="type" :value="type">
                    {{ trickTypeLabel(type) }}
                  </option>
                </select>
              </template>
            </form-field>

            <form-field id="tt-level" label="Tricktionary level">
              <template #default="field">
                <select v-bind="field" v-model="form.levels[TRICKTIONARY]" class="w-full block rounded border-line">
                  <option value="">
                    No level
                  </option>
                  <option v-for="level of tricktionaryLevels" :key="level" :value="level">
                    {{ level }}
                  </option>
                </select>
              </template>
            </form-field>

            <form-field id="slug" label="Slug" :error="slugError">
              <template #default="field">
                <input
                  v-bind="field"
                  v-model="form.slug"
                  type="text"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  class="w-full block rounded focus:border-b-ttred-900 border-line"
                >
              </template>
            </form-field>
          </div>
        </section>

        <section class="mt-6">
          <h2 class="mb-2">
            Tags
          </h2>

          <p v-if="canManageTags" class="text-muted text-sm">
            Tags are created and changed on the
            <router-link :to="{ name: 'tags' }">
              tags page
            </router-link>
          </p>

          <ul v-if="form.tags.length" class="list-none m-0 p-0 flex flex-col gap-2">
            <li
              v-for="(row, index) of form.tags"
              :key="row.tagId"
              class="border border-solid border-line rounded p-2 flex flex-wrap gap-x-4 gap-y-2 items-center"
            >
              <div class="flex-auto min-w-36">
                <span class="font-semibold">{{ tagsById.get(row.tagId)?.name ?? row.tagId }}</span>
                <span class="block font-mono text-sm text-muted">#{{ row.tagId }}</span>
                <p v-if="!appliesTo(row.tagId, form.discipline)" class="text-ttred-900 text-sm m-0">
                  Does not apply to {{ disciplineNames[form.discipline] }} tricks
                </p>
              </div>

              <template v-if="tagsById.get(row.tagId)?.valueType === TagValueType.Number">
                <label :for="`tag-number-${row.tagId}`" class="sr-only">{{ tagsById.get(row.tagId)?.name }}</label>
                <input
                  :id="`tag-number-${row.tagId}`"
                  v-model="row.number"
                  type="number"
                  required
                  :min="tagsById.get(row.tagId)?.min ?? undefined"
                  :max="tagsById.get(row.tagId)?.max ?? undefined"
                  :step="tagsById.get(row.tagId)?.step ?? 'any'"
                  :disabled="!canEditTricks"
                  class="w-32 rounded border-line disabled:bg-sunken"
                >
              </template>

              <template v-else-if="tagsById.get(row.tagId)?.valueType === TagValueType.Enum && tagsById.get(row.tagId)?.multiple">
                <fieldset class="flex flex-wrap gap-x-4 border-0 p-0 m-0" :disabled="!canEditTricks">
                  <legend class="sr-only">
                    {{ tagsById.get(row.tagId)?.name }}
                  </legend>
                  <label v-for="value of tagsById.get(row.tagId)?.values ?? []" :key="value.id" class="flex items-center gap-1">
                    <input v-model="row.values" type="checkbox" :value="value.id">
                    {{ value.name }}
                  </label>
                </fieldset>
              </template>

              <template v-else-if="tagsById.get(row.tagId)?.valueType === TagValueType.Enum">
                <label :for="`tag-value-${row.tagId}`" class="sr-only">{{ tagsById.get(row.tagId)?.name }}</label>
                <select
                  :id="`tag-value-${row.tagId}`"
                  :value="row.values[0] ?? ''"
                  required
                  :disabled="!canEditTricks"
                  class="w-max rounded border-line disabled:bg-sunken"
                  @change="row.values = [($event.target as HTMLSelectElement).value]"
                >
                  <option value="" disabled>
                    Pick a value
                  </option>
                  <option v-for="value of tagsById.get(row.tagId)?.values ?? []" :key="value.id" :value="value.id">
                    {{ value.name }}
                  </option>
                </select>
              </template>

              <button
                v-if="canEditTricks"
                type="button"
                class="btn w-max"
                :aria-label="`Remove the ${tagsById.get(row.tagId)?.name ?? row.tagId} tag`"
                @click="form.tags.splice(index, 1)"
              >
                Remove
              </button>
            </li>
          </ul>
          <p v-else class="text-muted">
            No tags.
          </p>

          <div v-if="canEditTricks && addableTags.length" class="flex flex-wrap gap-2 items-end mt-2">
            <div>
              <label for="tag-to-add" class="block text-sm text-muted">Tag to add</label>
              <select id="tag-to-add" v-model="tagToAdd" class="w-max block rounded border-line">
                <option value="">
                  Pick a tag
                </option>
                <option v-for="tag of addableTags" :key="tag.id" :value="tag.id">
                  {{ tag.name }}
                </option>
              </select>
            </div>
            <button type="button" class="btn w-max" :disabled="tagToAdd === ''" @click="addTag()">
              Add tag
            </button>
          </div>
        </section>

        <section class="mt-6">
          <h2 class="mb-2">
            Prerequisites
          </h2>

          <div class="grid md:grid-cols-2 gap-6">
            <prerequisite-table
              title="Previous"
              hint="Tricks to learn before this one"
              empty="No previous tricks"
              add-label="Trick to add before this one"
              id-prefix="previous"
              :rows="previousRows"
              :options="previousOptions"
              :editable="canEditTricks"
              @add="form.prerequisites.push($event)"
              @remove="form.prerequisites = form.prerequisites.filter(id => id !== $event)"
            />

            <prerequisite-table
              title="Next"
              hint="Tricks this one is a prerequisite for"
              empty="No next tricks"
              add-label="Trick to add after this one"
              id-prefix="next"
              :rows="nextRows"
              :options="nextOptions"
              :editable="canEditTricks"
              @add="form.prerequisiteFor.push($event)"
              @remove="form.prerequisiteFor = form.prerequisiteFor.filter(id => id !== $event)"
            />
          </div>
        </section>

        <section class="mt-6">
          <h2 class="mb-2">
            Localisation
          </h2>

          <div class="grid lg:grid-cols-2 gap-x-8">
            <h3 class="mb-2 font-semibold lg:col-start-1 lg:row-start-1">
              English
            </h3>
            <localisation-fields v-model="form.en" id-prefix="en" lang="en" :readonly="!canEditTricks" :column="1" />

            <template v-if="translationLangs.length">
              <div class="flex flex-wrap items-center gap-x-4 mb-2 lg:col-start-2 lg:row-start-1">
                <h3 class="font-semibold">
                  Translation
                </h3>
                <label for="translation-lang" class="sr-only">Language</label>
                <select
                  id="translation-lang"
                  v-model="lang"
                  :disabled="translationLangs.length === 1"
                  class="w-max block rounded border-line"
                >
                  <option v-for="option of translationLangs" :key="option" :value="option">
                    {{ languageLabel(option) }}
                  </option>
                </select>
              </div>

              <localisation-fields v-if="translations[lang]" v-model="translations[lang]" :id-prefix="lang" :lang="lang" :column="2" />
              <p v-else role="status" class="lg:col-start-2 lg:row-start-2">
                Loading the {{ lang }} translation...
              </p>
            </template>
          </div>
        </section>

        <section class="mt-6">
          <h2 class="mb-2">
            Levels
          </h2>

          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-solid border-line">
                  <th scope="col" class="py-2 pr-2">
                    Ruleset
                  </th>
                  <th scope="col" class="py-2 pr-2">
                    Level
                  </th>
                  <th scope="col" class="py-2">
                    Verification
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row of levelRows" :key="row.rulesId" class="border-b border-solid border-line">
                  <td class="py-2 pr-2">
                    {{ row.name }}
                  </td>
                  <td class="py-2 pr-2">
                    <template v-if="row.editable">
                      <label :for="`level-${row.rulesId}`" class="sr-only">{{ row.name }} level</label>
                      <input
                        :id="`level-${row.rulesId}`"
                        v-model="form.levels[row.rulesId]"
                        type="text"
                        placeholder="5, or 2-5"
                        :disabled="row.locked"
                        :aria-describedby="row.locked ? `level-locked-${row.rulesId}` : undefined"
                        class="w-full block rounded focus:border-b-ttred-900 border-line disabled:bg-sunken"
                      >
                      <p v-if="row.locked" :id="`level-locked-${row.rulesId}`" class="text-muted text-sm mt-1">
                        Verified above your own level
                      </p>
                    </template>
                    <template v-else>
                      {{ row.level === '' ? '–' : row.level }}
                    </template>
                  </td>
                  <td class="py-2">
                    <div class="flex flex-wrap gap-2 items-center">
                      <span>{{ row.verification }}</span>
                      <button
                        v-if="row.canVerifyJudge"
                        type="button"
                        class="btn w-max"
                        :disabled="verifying === row.rulesId"
                        @click="verify(row.rulesId, VerificationLevel.Judge)"
                      >
                        Verify as judge
                      </button>
                      <button
                        v-if="row.canVerifyOfficial"
                        type="button"
                        class="btn w-max"
                        :disabled="verifying === row.rulesId"
                        @click="verify(row.rulesId, VerificationLevel.Official)"
                      >
                        Verify as official
                      </button>
                      <button
                        v-if="row.canRecall"
                        type="button"
                        class="btn w-max"
                        :disabled="verifying === row.rulesId"
                        @click="verify(row.rulesId, null)"
                      >
                        Recall verification
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!levelRows.length">
                  <td colspan="3" class="py-2 text-muted">
                    No rulesets to level this trick against yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </form>

      <section class="mt-6">
        <h2 class="mb-2">
          Videos
        </h2>

        <trick-videos
          :trick-id="trickId"
          :videos="trick.videos"
          :pending-uploads="trick.pendingVideoUploads"
          :editable="canEditTricks"
          :title="trick.en?.name ?? trick.slug"
          @refresh="trickQuery.refetch()"
        />
      </section>
    </template>
  </div>

  <bottom-bar v-if="saveError">
    <p class="text-ttred-900" role="alert">
      {{ saveError }}
    </p>
  </bottom-bar>

  <bottom-bar>
    <router-link class="btn w-max whitespace-nowrap flex items-center gap-1" :to="backToTricks">
      <icon-chevron-left aria-hidden="true" />
      Back to tricks
    </router-link>

    <div class="flex items-center gap-4">
      <span v-if="dirty" class="text-muted whitespace-nowrap">
        Unsaved changes
      </span>

      <button
        type="submit"
        form="trick-editor"
        class="btn w-max whitespace-nowrap flex items-center gap-1"
        :disabled="!dirty || saving"
      >
        <icon-save aria-hidden="true" />
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </bottom-bar>
</template>

<script setup lang="ts">
import { ApolloError } from '@apollo/client/core'
import { useHead } from '@unhead/vue'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BottomBar from '../components/BottomBar.vue'
import FormField from '../components/FormField.vue'
import LocalisationFields from '../components/LocalisationFields.vue'
import PrerequisiteTable from '../components/PrerequisiteTable.vue'
import TrickVideos from '../components/TrickVideos.vue'
import {
  Discipline,
  TagValueType,
  TrickType,
  useAddTrickPrerequisiteMutation,
  useRemoveTrickPrerequisiteMutation,
  useRulesetsQuery,
  useSetTrickLevelMutation,
  useSetTrickLevelVerificationMutation,
  useSetTrickLocalisationMutation,
  useSetTrickTagsMutation,
  useTrickLocalisationQuery,
  useTrickQuery,
  useTrickOptionsQuery,
  useUpdateTrickDetailsMutation,
  VerificationLevel
} from '../graphql/generated/graphql'
import { disciplineNames, disciplineToSlug, languageLabel, localisationInput, parseNumber, toLocalisationValue, TRICK_TYPE_TAG, TRICKTIONARY, trickSorter, trickTypeOf } from '../helpers'
import useGrants, { verificationLevelRank } from '../hooks/useGrants'
import useTags from '../hooks/useTags'
import useUnsavedChanges from '../hooks/useUnsavedChanges'
import useTranslationLang from '../hooks/useTranslationLang'

import IconLoading from '~icons/mdi/loading'
import IconChevronLeft from '~icons/mdi/chevron-left'
import IconSave from '~icons/mdi/content-save-outline'

import type { TrickLocalisationInput, TrickQuery, TrickTagInput, UpdateTrickDetailsInput } from '../graphql/generated/graphql'
import type { LocalisationValue } from '../helpers'

type LoadedTrick = NonNullable<TrickQuery['trick']>

interface TagRow {
  tagId: string
  /** As the number input holds it, see `parseNumber` */
  number: string | number
  values: string[]
}

interface TrickForm {
  discipline: Discipline
  trickType: TrickType
  /** But the trick type, see `trickType` */
  tags: TagRow[]
  slug: string
  en: LocalisationValue
  prerequisites: string[]
  prerequisiteFor: string[]
  /** By ruleset, the tricktionary's own level included */
  levels: Record<string, string>
}

/** The ruleset whose levels are the tricktionary's own, shown with the details */

const tricktionaryLevels = ['1', '2', '3', '4', '5']
const verificationNames = ['Not verified', 'Judge', 'Official']

const route = useRoute()
const { canEditTricks, canEditLevels, canManageTags, levelEditorRank } = useGrants()
const { editableLangs: translationLangs, editLang: lang } = useTranslationLang()

const trickId = computed(() => String(route.params.id))

const trickQuery = useTrickQuery(() => ({ id: trickId.value }), { fetchPolicy: 'cache-and-network' })
const trick = computed(() => trickQuery.result.value?.trick ?? null)
const loading = trickQuery.loading
const error = trickQuery.error

useHead({ title: computed(() => trick.value ? `Edit: ${trick.value.en?.name ?? trick.value.slug}` : 'Edit trick') })

const { result: rulesetsResult } = useRulesetsQuery()
const rulesets = computed(() => rulesetsResult.value?.rulesets ?? [])

const { tagsById, trickTypes, trickTypeLabel, appliesTo } = useTags()

function toForm (loaded: LoadedTrick): TrickForm {
  const levels: Record<string, string> = { [TRICKTIONARY]: '' }
  for (const level of loaded.levels) levels[level.rulesId] = level.level

  return {
    discipline: loaded.discipline,
    trickType: trickTypeOf(loaded) ?? TrickType.Basic,
    tags: loaded.tags
      .filter(trickTag => trickTag.tag.id !== TRICK_TYPE_TAG)
      .map(trickTag => ({ tagId: trickTag.tag.id, number: trickTag.number ?? '', values: trickTag.values.map(value => value.id) })),
    slug: loaded.slug,
    en: toLocalisationValue(loaded.en),
    prerequisites: loaded.prerequisites.map(other => other.id),
    prerequisiteFor: loaded.prerequisiteFor.map(other => other.id),
    levels
  }
}

const form = ref<TrickForm>({
  discipline: Discipline.SingleRope,
  trickType: TrickType.Basic,
  tags: [],
  slug: '',
  en: toLocalisationValue(null),
  prerequisites: [],
  prerequisiteFor: [],
  levels: {}
})
/** What the trick looked like when it was loaded, or last saved, null until then */
const pristine = ref<TrickForm | null>(null)

/** Working copies and snapshots of every translation loaded so far, by language */
const translations = ref<Record<string, LocalisationValue>>({})
const pristineTranslations = ref<Record<string, LocalisationValue>>({})

const saving = ref(false)
const saveError = ref<string | null>(null)
const slugError = ref<string | null>(null)
const verifying = ref<string | null>(null)

function resetFrom (loaded: LoadedTrick) {
  pristine.value = toForm(loaded)
  form.value = toForm(loaded)
}

watch(trickId, () => {
  pristine.value = null
  translations.value = {}
  pristineTranslations.value = {}
  saveError.value = null
  slugError.value = null
})

const translationQuery = useTrickLocalisationQuery(
  () => ({ id: trickId.value, lang: lang.value }),
  () => ({ enabled: lang.value !== '', fetchPolicy: 'cache-and-network' })
)

translationQuery.onResult(result => {
  if (result.loading) return
  const variables = translationQuery.variables.value
  if (variables?.id !== trickId.value) return
  // a language keeps the copy it was first given, edits included
  if (variables.lang in translations.value) return
  translations.value[variables.lang] = toLocalisationValue(result.data?.trick?.localisation)
  pristineTranslations.value[variables.lang] = toLocalisationValue(result.data?.trick?.localisation)
})

const optionsQuery = useTrickOptionsQuery(
  () => ({ discipline: form.value.discipline }),
  () => ({ enabled: canEditTricks.value && trick.value != null })
)
const candidates = computed(() => optionsQuery.result.value?.tricks ?? [])

const trickNames = computed(() => {
  const names = new Map<string, string>()
  for (const other of [...candidates.value, ...trick.value?.prerequisites ?? [], ...trick.value?.prerequisiteFor ?? []]) {
    names.set(other.id, other.en?.name ?? other.slug)
  }
  return names
})

function rowsFor (linked: string[]) {
  return linked
    .map(id => ({ id, name: trickNames.value.get(id) ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The tricks that could still be linked in a column, the linked ones left out */
function optionsFor (linked: string[]) {
  return candidates.value
    .filter(other => other.id !== trickId.value && !linked.includes(other.id))
    .sort(trickSorter)
    .map(other => ({ id: other.id, name: other.en?.name ?? other.slug, level: other.ttLevels[0]?.level ?? null }))
}

const previousRows = computed(() => rowsFor(form.value.prerequisites))
const nextRows = computed(() => rowsFor(form.value.prerequisiteFor))
const previousOptions = computed(() => optionsFor(form.value.prerequisites))
const nextOptions = computed(() => optionsFor(form.value.prerequisiteFor))

const storedLevels = computed(() => new Map((trick.value?.levels ?? []).map(level => [level.rulesId, level])))

const levelRows = computed(() => rulesets.value
  .filter(ruleset => ruleset.id !== TRICKTIONARY)
  .map(ruleset => {
    const stored = storedLevels.value.get(ruleset.id)
    const ownRank = levelEditorRank(ruleset.id)
    const rank = verificationLevelRank(stored?.verificationLevel)

    return {
      rulesId: ruleset.id,
      name: ruleset.name,
      level: form.value.levels[ruleset.id] ?? '',
      editable: canEditLevels(ruleset.id),
      locked: rank > ownRank,
      verification: verificationNames[rank],
      canVerifyJudge: stored != null && ownRank >= 1 && rank < 1,
      canVerifyOfficial: stored != null && ownRank === 2 && rank < 2,
      canRecall: stored != null && rank > 0 && ownRank >= rank
    }
  })
)

function localisationChanged (value: LocalisationValue, original: LocalisationValue) {
  const left = localisationInput(value)
  const right = localisationInput(original)
  return left.name !== right.name ||
    left.description !== right.description ||
    left.alternativeNames.join('\n') !== right.alternativeNames.join('\n')
}

const detailsInput = computed<UpdateTrickDetailsInput | null>(() => {
  const base = pristine.value
  if (!base) return null

  const data: UpdateTrickDetailsInput = {}
  if (form.value.discipline !== base.discipline) data.discipline = form.value.discipline
  if (form.value.trickType !== base.trickType) data.trickType = form.value.trickType
  if (form.value.slug !== base.slug) data.slug = form.value.slug

  return Object.keys(data).length ? data : null
})

const localisationChanges = computed(() => {
  const base = pristine.value
  if (!base) return []

  const changes: Array<{ lang: string, data: TrickLocalisationInput }> = []
  if (localisationChanged(form.value.en, base.en)) changes.push({ lang: 'en', data: localisationInput(form.value.en) })

  for (const [other, value] of Object.entries(translations.value)) {
    const original = pristineTranslations.value[other]
    if (original && localisationChanged(value, original)) changes.push({ lang: other, data: localisationInput(value) })
  }

  return changes
})

const prerequisiteChanges = computed(() => {
  const base = pristine.value
  if (!base) return []

  const id = trickId.value
  const changes: Array<{ add: boolean, trickId: string, prerequisiteId: string }> = []

  for (const other of form.value.prerequisites) {
    if (!base.prerequisites.includes(other)) changes.push({ add: true, trickId: id, prerequisiteId: other })
  }
  for (const other of base.prerequisites) {
    if (!form.value.prerequisites.includes(other)) changes.push({ add: false, trickId: id, prerequisiteId: other })
  }
  // the other trick owns an edge that makes this one its prerequisite
  for (const other of form.value.prerequisiteFor) {
    if (!base.prerequisiteFor.includes(other)) changes.push({ add: true, trickId: other, prerequisiteId: id })
  }
  for (const other of base.prerequisiteFor) {
    if (!form.value.prerequisiteFor.includes(other)) changes.push({ add: false, trickId: other, prerequisiteId: id })
  }

  return changes
})

const addableTags = computed(() => [...tagsById.value.values()]
  .filter(tag => !tag.system && appliesTo(tag.id, form.value.discipline) && !form.value.tags.some(row => row.tagId === tag.id))
)

const tagToAdd = ref('')

function addTag () {
  if (tagToAdd.value === '') return
  form.value.tags.push({ tagId: tagToAdd.value, number: '', values: [] })
  tagToAdd.value = ''
}

function tagInput (row: TagRow): TrickTagInput {
  switch (tagsById.value.get(row.tagId)?.valueType) {
    case TagValueType.Number:
      return { tagId: row.tagId, number: parseNumber(row.number) }
    case TagValueType.Enum:
      return { tagId: row.tagId, values: row.values }
    default:
      return { tagId: row.tagId }
  }
}

function tagsKey (rows: TagRow[]) {
  return JSON.stringify(rows
    .map(row => [row.tagId, parseNumber(row.number), [...row.values].sort()])
    .sort(([a], [b]) => String(a).localeCompare(String(b))))
}

/** Null while unchanged */
const tagChanges = computed<TrickTagInput[] | null>(() => {
  const base = pristine.value
  if (!base || tagsKey(form.value.tags) === tagsKey(base.tags)) return null
  return form.value.tags.map(tagInput)
})

const levelChanges = computed(() => {
  const base = pristine.value
  if (!base) return []

  return Object.entries(form.value.levels)
    .filter(([rulesId, level]) => level !== (base.levels[rulesId] ?? ''))
    .map(([rulesId, level]) => ({ rulesId, level: level === '' ? null : level }))
})

const dirty = computed(() =>
  detailsInput.value != null ||
  tagChanges.value != null ||
  localisationChanges.value.length > 0 ||
  prerequisiteChanges.value.length > 0 ||
  levelChanges.value.length > 0
)

watch(() => trickQuery.result.value?.trick, loaded => {
  if (loaded?.id !== trickId.value) return
  // a fresh read of the same trick must not throw away what is being typed
  if (dirty.value) return
  resetFrom(loaded)
}, { immediate: true })

const backToTricks = computed(() => trick.value
  ? { name: 'tricks', query: { discipline: disciplineToSlug(trick.value.discipline) } }
  : { name: 'tricks' }
)

const { mutate: updateDetails } = useUpdateTrickDetailsMutation({ throws: 'always' })
const { mutate: setTrickTags } = useSetTrickTagsMutation({ throws: 'always' })
const { mutate: setLocalisation } = useSetTrickLocalisationMutation({ throws: 'always' })
const { mutate: addPrerequisite } = useAddTrickPrerequisiteMutation({ throws: 'always' })
const { mutate: removePrerequisite } = useRemoveTrickPrerequisiteMutation({ throws: 'always' })
const { mutate: setLevel } = useSetTrickLevelMutation({ throws: 'always' })
const { mutate: setVerification } = useSetTrickLevelVerificationMutation({ throws: 'always' })

function isSlugCollision (err: unknown) {
  return err instanceof ApolloError && err.graphQLErrors.some(graphQLError => graphQLError.extensions?.code === 'ENTITY_COLLISION')
}

function errorMessage (err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong, please try again'
}

async function save () {
  if (!dirty.value || saving.value) return

  saving.value = true
  saveError.value = null
  slugError.value = null

  const id = trickId.value
  let saved = false

  try {
    const details = detailsInput.value
    const tags = tagChanges.value
    // a trick can't move to a discipline its tags don't apply to, so those come off first
    const from = pristine.value?.discipline
    if (tags && details?.discipline != null && from != null) {
      await setTrickTags({ trickId: id, tags: tags.filter(input => appliesTo(String(input.tagId), from)) })
    }
    if (details) await updateDetails({ trickId: id, data: details })
    if (tags) await setTrickTags({ trickId: id, tags })

    for (const change of localisationChanges.value) {
      await setLocalisation({ trickId: id, lang: change.lang, data: change.data })
    }

    for (const change of prerequisiteChanges.value) {
      const variables = { trickId: change.trickId, prerequisiteId: change.prerequisiteId }
      if (change.add) await addPrerequisite(variables)
      else await removePrerequisite(variables)
    }

    for (const change of levelChanges.value) {
      await setLevel({ trickId: id, rulesId: change.rulesId, level: change.level })
    }

    saved = true
  } catch (err) {
    if (isSlugCollision(err)) slugError.value = 'A trick with this slug already exists in this discipline'
    else saveError.value = errorMessage(err)
  }

  // whatever got through is stored now, so the stored trick is the new
  // pristine and after a failure the form keeps only what still needs saving
  try {
    const refreshed = (await trickQuery.refetch())?.data.trick
    if (refreshed) {
      pristine.value = toForm(refreshed)
      if (saved) {
        form.value = toForm(refreshed)
        for (const [other, value] of Object.entries(translations.value)) {
          pristineTranslations.value[other] = toLocalisationValue(value)
        }
      }
    }
  } catch (err) {
    saveError.value ??= errorMessage(err)
  } finally {
    saving.value = false
  }
}

async function verify (rulesId: string, verificationLevel: VerificationLevel | null) {
  if (verificationLevel === null && !window.confirm('Recall the verification of this level?')) return

  verifying.value = rulesId
  saveError.value = null

  try {
    await setVerification({ trickId: trickId.value, rulesId, verificationLevel })
  } catch (err) {
    saveError.value = errorMessage(err)
  } finally {
    verifying.value = null
  }
}

useUnsavedChanges(dirty, 'This trick')
</script>
