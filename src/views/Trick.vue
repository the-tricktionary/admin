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

          <trick-tags-editor v-model="form.tags" :discipline="form.discipline" :disabled="!canEditTricks" />
        </section>

        <section class="mt-6">
          <h2 class="mb-2">
            Prerequisites
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div class="relative overflow-x-auto">
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
import TrickTagsEditor from '../components/TrickTagsEditor.vue'
import TrickVideos from '../components/TrickVideos.vue'
import {
  Discipline,
  useAddTrickPrerequisiteMutation,
  useRemoveTrickPrerequisiteMutation,
  useRulesetsQuery,
  useSetTrickLevelMutation,
  useSetTrickLevelVerificationMutation,
  useSetTrickLocalisationMutation,
  useTrickLocalisationQuery,
  useTrickQuery,
  useTrickOptionsQuery,
  useUpdateTrickDetailsMutation,
  VerificationLevel
} from '../graphql/generated/graphql'
import { disciplineNames, disciplineToSlug, languageLabel, localisationInput, tagRows, tagRowsKey, toLocalisationValue, TRICKTIONARY, trickSorter } from '../helpers'
import useGrants, { verificationLevelRank } from '../hooks/useGrants'
import useTags from '../hooks/useTags'
import useUnsavedChanges from '../hooks/useUnsavedChanges'
import useTranslationLang from '../hooks/useTranslationLang'

import IconLoading from '~icons/mdi/loading'
import IconChevronLeft from '~icons/mdi/chevron-left'
import IconSave from '~icons/mdi/content-save-outline'

import type { TrickLocalisationInput, TrickQuery, UpdateTrickDetailsInput } from '../graphql/generated/graphql'
import type { LocalisationValue, TagRow } from '../helpers'

type LoadedTrick = NonNullable<TrickQuery['trick']>

interface TrickForm {
  discipline: Discipline
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

const { tagInputs } = useTags()

function toForm (loaded: LoadedTrick): TrickForm {
  const levels: Record<string, string> = { [TRICKTIONARY]: '' }
  for (const level of loaded.levels) levels[level.rulesId] = level.level

  return {
    discipline: loaded.discipline,
    tags: tagRows(loaded),
    slug: loaded.slug,
    en: toLocalisationValue(loaded.en),
    prerequisites: loaded.prerequisites.map(other => other.id),
    prerequisiteFor: loaded.prerequisiteFor.map(other => other.id),
    levels
  }
}

const form = ref<TrickForm>({
  discipline: Discipline.SingleRope,
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
  const moving = form.value.discipline !== base.discipline
  if (moving) data.discipline = form.value.discipline
  if (form.value.slug !== base.slug) data.slug = form.value.slug
  // the tags that don't apply to a new discipline come off with the move
  if (moving || tagRowsKey(form.value.tags) !== tagRowsKey(base.tags)) data.tags = tagInputs(form.value.tags, form.value.discipline)

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

const levelChanges = computed(() => {
  const base = pristine.value
  if (!base) return []

  return Object.entries(form.value.levels)
    .filter(([rulesId, level]) => level !== (base.levels[rulesId] ?? ''))
    .map(([rulesId, level]) => ({ rulesId, level: level === '' ? null : level }))
})

const dirty = computed(() =>
  detailsInput.value != null ||
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
    if (details) await updateDetails({ trickId: id, data: details })

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
