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
              {{ disciplineNames[discipline] }}
            </dd>
            <dt>Trick type</dt>
            <dd>
              {{ trickType }}
            </dd>
            <dt>Tricktionary level</dt>
            <dd>
              {{ ttLevel === '' ? 'No level' : ttLevel }}
            </dd>
            <dt>Slug</dt>
            <dd>
              {{ slug }}
            </dd>
          </dl>

          <div v-else class="grid md:grid-cols-2 gap-x-4">
            <form-field id="discipline" label="Discipline">
              <template #default="field">
                <select v-bind="field" v-model="discipline" class="w-full block rounded border-line">
                  <option v-for="(label, value) of disciplineNames" :key="value" :value="value">
                    {{ label }}
                  </option>
                </select>
              </template>
            </form-field>

            <form-field id="trick-type" label="Trick type">
              <template #default="field">
                <select v-bind="field" v-model="trickType" class="w-full block rounded border-line">
                  <option v-for="type of trickTypes" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
              </template>
            </form-field>

            <form-field id="tt-level" label="Tricktionary level">
              <template #default="field">
                <select v-bind="field" v-model="ttLevel" class="w-full block rounded border-line">
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
                  v-model="slug"
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
              @add="prerequisites = [...prerequisites, $event]"
              @remove="prerequisites = prerequisites.filter(id => id !== $event)"
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
              @add="prerequisiteFor = [...prerequisiteFor, $event]"
              @remove="prerequisiteFor = prerequisiteFor.filter(id => id !== $event)"
            />
          </div>
        </section>

        <section class="mt-6">
          <h2 class="mb-2">
            Localisation
          </h2>

          <div class="grid lg:grid-cols-2 gap-x-8">
            <div>
              <h3 class="mb-2 font-semibold">
                English
              </h3>
              <localisation-fields v-model="en" id-prefix="en" :readonly="!canEditTricks" />
            </div>

            <div v-if="translationLangs.length">
              <h3 class="mb-2 font-semibold">
                Translation
              </h3>

              <form-field id="translation-lang" label="Language">
                <template #default="field">
                  <select
                    v-bind="field"
                    v-model="lang"
                    :disabled="translationLangs.length === 1"
                    class="w-full block rounded border-line"
                  >
                    <option v-for="option of translationLangs" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                </template>
              </form-field>

              <div v-if="translation">
                <localisation-fields v-model="translation" :id-prefix="lang" />
              </div>
              <p v-else role="status">
                Loading the {{ lang }} translation...
              </p>
            </div>
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
                        :value="row.level"
                        type="text"
                        placeholder="5, or 2-5"
                        :disabled="row.locked"
                        :aria-describedby="row.locked ? `level-locked-${row.rulesId}` : undefined"
                        class="w-full block rounded focus:border-b-ttred-900 border-line disabled:bg-sunken"
                        @input="levels[row.rulesId] = inputValue($event)"
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
                        class="rounded bg-surface border border-solid border-line px-3 py-1 cursor-pointer hover:bg-elevated whitespace-nowrap"
                        :disabled="verifying === row.rulesId"
                        @click="verify(row.rulesId, VerificationLevel.Judge)"
                      >
                        Verify as judge
                      </button>
                      <button
                        v-if="row.canVerifyOfficial"
                        type="button"
                        class="rounded bg-surface border border-solid border-line px-3 py-1 cursor-pointer hover:bg-elevated whitespace-nowrap"
                        :disabled="verifying === row.rulesId"
                        @click="verify(row.rulesId, VerificationLevel.Official)"
                      >
                        Verify as official
                      </button>
                      <button
                        v-if="row.canRecall"
                        type="button"
                        class="rounded bg-surface border border-solid border-line px-3 py-1 cursor-pointer hover:bg-elevated whitespace-nowrap"
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
          @refresh="refreshVideos()"
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
    <router-link class="btn w-max whitespace-nowrap" :to="backToTricks">
      Back to tricks
    </router-link>

    <span v-if="dirty" class="self-center text-muted whitespace-nowrap">
      Unsaved changes
    </span>

    <button
      type="submit"
      form="trick-editor"
      class="btn w-max whitespace-nowrap"
      :disabled="!dirty || saving"
    >
      {{ saving ? 'Saving...' : 'Save' }}
    </button>
  </bottom-bar>
</template>

<script setup lang="ts">
import { ApolloError } from '@apollo/client/core'
import { useEventListener } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import BottomBar from '../components/BottomBar.vue'
import FormField from '../components/FormField.vue'
import LocalisationFields from '../components/LocalisationFields.vue'
import PrerequisiteTable from '../components/PrerequisiteTable.vue'
import TrickVideos from '../components/TrickVideos.vue'
import {
  Discipline,
  TrickType,
  useAddTrickPrerequisiteMutation,
  useRemoveTrickPrerequisiteMutation,
  useRulesetsQuery,
  useSetTrickLevelMutation,
  useSetTrickLevelVerificationMutation,
  useSetTrickLocalisationMutation,
  useTrickLocalisationQuery,
  useTrickQuery,
  useTricksQuery,
  useUpdateTrickDetailsMutation,
  VerificationLevel
} from '../graphql/generated/graphql'
import { disciplineNames, disciplineToSlug, trickSorter } from '../helpers'
import useGrants, { verificationLevelRank } from '../hooks/useGrants'

import IconLoading from '~icons/mdi/loading'

import type { TrickLocalisationInput, TrickQuery, UpdateTrickDetailsInput } from '../graphql/generated/graphql'
import type { LocalisationValue } from '../helpers'

type LoadedTrick = NonNullable<TrickQuery['trick']>

interface Snapshot {
  discipline: Discipline
  trickType: TrickType
  ttLevel: string
  slug: string
  en: LocalisationValue
  prerequisites: string[]
  prerequisiteFor: string[]
  levels: Record<string, string>
}

interface PrerequisiteChange {
  add: boolean
  trickId: string
  prerequisiteId: string
}

/** The ruleset whose levels are the tricktionary's own, shown with the details */
const TRICKTIONARY = 'tricktionary'

const tricktionaryLevels = ['1', '2', '3', '4', '5']
const trickTypes = Object.values(TrickType).sort((a, b) => a.localeCompare(b))
const verificationNames = ['Not verified', 'Judge', 'Official']

const route = useRoute()
const { canEditTricks, canEditLevels, levelEditorRank, translatorLangs } = useGrants()

const trickId = computed(() => String(route.params.id))

const trickQuery = useTrickQuery(() => ({ id: trickId.value }), { fetchPolicy: 'cache-and-network' })
const trick = computed(() => trickQuery.result.value?.trick ?? null)
const loading = trickQuery.loading
const error = trickQuery.error

const { result: rulesetsResult } = useRulesetsQuery()
const rulesets = computed(() => rulesetsResult.value?.rulesets ?? [])

/** What the trick looked like when it was loaded, or last saved */
const pristine = ref<Snapshot | null>(null)

const discipline = ref(Discipline.SingleRope)
const trickType = ref(TrickType.Basic)
const ttLevel = ref('')
const slug = ref('')
const en = ref<LocalisationValue>(emptyLocalisation())
const prerequisites = ref<string[]>([])
const prerequisiteFor = ref<string[]>([])
const levels = ref<Record<string, string>>({})

/** Working copies and snapshots of every translation loaded so far, by language */
const translations = ref<Record<string, LocalisationValue>>({})
const pristineTranslations = ref<Record<string, LocalisationValue>>({})

const saving = ref(false)
const saveError = ref<string | null>(null)
const slugError = ref<string | null>(null)
const verifying = ref<string | null>(null)

function emptyLocalisation (): LocalisationValue {
  return { name: '', alternativeNames: [], description: '' }
}

function cloneLocalisation (value: LocalisationValue): LocalisationValue {
  return { ...value, alternativeNames: [...value.alternativeNames] }
}

function toLocalisationValue (localisation: { name: string, alternativeNames?: string[] | null, description?: string | null } | null | undefined): LocalisationValue {
  if (!localisation) return emptyLocalisation()
  return {
    name: localisation.name,
    alternativeNames: [...localisation.alternativeNames ?? []],
    description: localisation.description ?? ''
  }
}

function inputValue (event: Event) {
  return (event.target as HTMLInputElement).value
}

function resetFrom (loaded: LoadedTrick) {
  const levelValues: Record<string, string> = {}
  for (const level of loaded.levels) levelValues[level.rulesId] = level.level

  pristine.value = {
    discipline: loaded.discipline,
    trickType: loaded.trickType,
    ttLevel: levelValues[TRICKTIONARY] ?? '',
    slug: loaded.slug,
    en: toLocalisationValue(loaded.en),
    prerequisites: loaded.prerequisites.map(other => other.id),
    prerequisiteFor: loaded.prerequisiteFor.map(other => other.id),
    levels: levelValues
  }

  discipline.value = pristine.value.discipline
  trickType.value = pristine.value.trickType
  ttLevel.value = pristine.value.ttLevel
  slug.value = pristine.value.slug
  en.value = cloneLocalisation(pristine.value.en)
  prerequisites.value = [...pristine.value.prerequisites]
  prerequisiteFor.value = [...pristine.value.prerequisiteFor]
  levels.value = { ...pristine.value.levels }
}

watch(trickId, () => {
  pristine.value = null
  translations.value = {}
  pristineTranslations.value = {}
  saveError.value = null
  slugError.value = null
})

const translationLangs = computed(() => translatorLangs.value.filter(other => other !== 'en').sort((a, b) => a.localeCompare(b)))
const lang = ref('')

watch(translationLangs, langs => {
  if (langs.length && !langs.includes(lang.value)) lang.value = langs[0]
}, { immediate: true })

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
  const value = toLocalisationValue(result.data?.trick?.localisation)
  translations.value[variables.lang] = value
  pristineTranslations.value[variables.lang] = cloneLocalisation(value)
})

const translation = computed<LocalisationValue | null>({
  get: () => translations.value[lang.value] ?? null,
  set: value => {
    if (value) translations.value[lang.value] = value
  }
})

const tricksQuery = useTricksQuery(
  () => ({ discipline: discipline.value, searchQuery: null }),
  () => ({ enabled: canEditTricks.value && trick.value != null })
)
const candidates = computed(() => tricksQuery.result.value?.tricks ?? [])

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
    .map(other => ({ id: other.id, name: other.en?.name ?? other.slug }))
}

const previousRows = computed(() => rowsFor(prerequisites.value))
const nextRows = computed(() => rowsFor(prerequisiteFor.value))
const previousOptions = computed(() => optionsFor(prerequisites.value))
const nextOptions = computed(() => optionsFor(prerequisiteFor.value))

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
      level: levels.value[ruleset.id] ?? '',
      editable: canEditLevels(ruleset.id),
      locked: rank > ownRank,
      verification: verificationNames[rank],
      canVerifyJudge: stored != null && ownRank >= 1 && rank < 1,
      canVerifyOfficial: stored != null && ownRank === 2 && rank < 2,
      canRecall: stored != null && rank > 0 && ownRank >= rank
    }
  })
)

function localisationInput (value: LocalisationValue): TrickLocalisationInput {
  return {
    name: value.name,
    alternativeNames: value.alternativeNames.map(alternative => alternative.trim()).filter(alternative => alternative !== ''),
    description: value.description
  }
}

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
  if (discipline.value !== base.discipline) data.discipline = discipline.value
  if (trickType.value !== base.trickType) data.trickType = trickType.value
  if (slug.value !== base.slug) data.slug = slug.value

  return Object.keys(data).length ? data : null
})

const ttLevelChanged = computed(() => pristine.value != null && ttLevel.value !== pristine.value.ttLevel)

const localisationChanges = computed(() => {
  const base = pristine.value
  if (!base) return []

  const changes: Array<{ lang: string, data: TrickLocalisationInput }> = []
  if (localisationChanged(en.value, base.en)) changes.push({ lang: 'en', data: localisationInput(en.value) })

  for (const [other, value] of Object.entries(translations.value)) {
    const original = pristineTranslations.value[other]
    if (original && localisationChanged(value, original)) changes.push({ lang: other, data: localisationInput(value) })
  }

  return changes
})

const prerequisiteChanges = computed<PrerequisiteChange[]>(() => {
  const base = pristine.value
  if (!base) return []

  const id = trickId.value
  const changes: PrerequisiteChange[] = []

  for (const other of prerequisites.value) {
    if (!base.prerequisites.includes(other)) changes.push({ add: true, trickId: id, prerequisiteId: other })
  }
  for (const other of base.prerequisites) {
    if (!prerequisites.value.includes(other)) changes.push({ add: false, trickId: id, prerequisiteId: other })
  }
  // the other trick owns an edge that makes this one its prerequisite
  for (const other of prerequisiteFor.value) {
    if (!base.prerequisiteFor.includes(other)) changes.push({ add: true, trickId: other, prerequisiteId: id })
  }
  for (const other of base.prerequisiteFor) {
    if (!prerequisiteFor.value.includes(other)) changes.push({ add: false, trickId: other, prerequisiteId: id })
  }

  return changes
})

const levelChanges = computed(() => {
  const base = pristine.value
  if (!base) return []

  return levelRows.value
    .filter(row => row.level !== (base.levels[row.rulesId] ?? ''))
    .map(row => ({ rulesId: row.rulesId, level: row.level === '' ? null : row.level }))
})

const dirty = computed(() =>
  detailsInput.value != null ||
  ttLevelChanged.value ||
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

  try {
    const details = detailsInput.value
    if (details) await updateDetails({ trickId: id, data: details })

    if (ttLevelChanged.value) {
      await setLevel({ trickId: id, rulesId: TRICKTIONARY, level: ttLevel.value === '' ? null : ttLevel.value })
    }

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

    await trickQuery.refetch()
    const refreshed = trickQuery.result.value?.trick
    if (refreshed) resetFrom(refreshed)
    for (const [other, value] of Object.entries(translations.value)) {
      pristineTranslations.value[other] = cloneLocalisation(value)
    }
  } catch (err) {
    if (isSlugCollision(err)) slugError.value = 'A trick with this slug already exists in this discipline'
    else saveError.value = errorMessage(err)
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

async function refreshVideos () {
  await trickQuery.refetch()
}

onBeforeRouteLeave(() => !dirty.value || window.confirm('This trick has changes that have not been saved yet. Leave the page anyway?'))

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (!dirty.value) return
  event.preventDefault()
})
</script>
