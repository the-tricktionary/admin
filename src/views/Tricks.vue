<template>
  <discipline-selector v-model:discipline="discipline" />

  <div class="container mx-auto px-2 pt-2 flex justify-end">
    <label class="flex items-center gap-2 text-sm whitespace-nowrap">
      Translation status
      <select v-model="statusLang" class="rounded border-line py-1 text-sm w-max">
        <option value="">
          None
        </option>
        <option v-for="tag of translatableLangs" :key="tag" :value="tag">
          {{ languageLabel(tag) }}
        </option>
      </select>
    </label>
  </div>

  <bottom-bar>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 w-full text-sm">
      <label class="flex items-center gap-2 whitespace-nowrap">
        Missing translation
        <select v-model="missingLang" class="rounded border-line py-1 text-sm w-max">
          <option value="">
            –
          </option>
          <option v-for="tag of translatableLangs" :key="tag" :value="tag">
            {{ languageLabel(tag) }}
          </option>
        </select>
      </label>

      <div role="group" aria-label="Level" class="flex items-center gap-2 whitespace-nowrap">
        Level
        <label for="filter-rules" class="sr-only">Ruleset</label>
        <select id="filter-rules" v-model="levelRulesId" class="rounded border-line py-1 text-sm w-max">
          <option value="">
            –
          </option>
          <option v-for="ruleset of rulesets" :key="ruleset.id" :value="ruleset.id">
            {{ ruleset.name }}
          </option>
        </select>

        <label for="filter-level" class="sr-only">Level status</label>
        <select
          id="filter-level"
          v-model="levelBelow"
          :disabled="levelRulesId === ''"
          class="rounded border-line py-1 text-sm w-max"
        >
          <option value="">
            Missing
          </option>
          <option value="judge">
            Missing or unverified
          </option>
          <option value="official">
            Missing or not official
          </option>
        </select>
      </div>

      <label class="flex items-center gap-2 whitespace-nowrap">
        <input v-model="withoutVideos" type="checkbox">
        Without videos
      </label>

      <label class="flex items-center gap-2 whitespace-nowrap">
        <input v-model="missingRequiredTags" type="checkbox">
        Missing required tags
      </label>

      <button v-if="filter" type="button" class="btn w-max whitespace-nowrap py-1 text-sm" @click="clearFilters()">
        Clear filters
      </button>
    </div>
  </bottom-bar>

  <bottom-bar>
    <input
      v-model="search"
      type="search"
      placeholder="Search tricks"
      aria-label="Search tricks"
      class="rounded focus:border-b-ttred-900 border-line flex-grow"
    >

    <router-link
      v-if="canEditTricks"
      class="btn w-max whitespace-nowrap flex items-center gap-1"
      :to="{ name: 'trick-new', query: { discipline: disciplineToSlug(discipline) } }"
    >
      <icon-plus aria-hidden="true" />
      Create new
    </router-link>
  </bottom-bar>

  <div class="container mx-auto p-2 pb-8">
    <div v-if="loading && !tricks.length" class="flex items-center justify-center flex-col" role="status">
      <icon-loading class="animate-spin w-32 h-32" aria-hidden="true" />
      Loading tricks...
    </div>
    <div v-else-if="!tricks.length" class="flex items-center justify-center flex-col" role="status">
      <icon-confused class="w-32 h-32" aria-hidden="true" />
      {{ filter ? 'No tricks match the discipline, search and filters you picked.' : 'No tricks match the discipline and search you picked.' }}
    </div>
    <div v-else>
      <section v-for="levelGroup of levelGroups" :key="levelGroup.level">
        <h2 class="flex items-center gap-4 mt-6 text-2xl font-bold">
          <span class="flex-grow border-b border-line" />
          {{ levelGroup.label }}
          <span class="flex-grow border-b border-line" />
        </h2>

        <template v-for="typeGroup of levelGroup.types" :key="typeGroup.trickType">
          <h3 class="text-center text-xl mt-4 mb-2">
            {{ typeGroup.label }}
          </h3>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
            <router-link
              v-for="trick of typeGroup.tricks"
              :key="trick.id"
              class="flex flex-col rounded border border-line p-2 hover:bg-elevated"
              :to="{ name: 'trick', params: { id: trick.id } }"
            >
              <span class="font-semibold">{{ trick.en?.name ?? trick.slug }}</span>
              <span class="text-muted text-sm">{{ trick.slug }}</span>
              <ul class="list-none m-0 p-0 flex flex-wrap gap-1 mt-2" aria-label="Status">
                <li
                  v-for="status of trickStatuses(trick)"
                  :key="status.kind"
                  :class="statusClasses[status.state]"
                  class="flex items-center gap-1 rounded border border-solid px-1.5 py-0.5 text-xs"
                  :title="status.title"
                >
                  <component :is="status.icon" aria-hidden="true" />
                  {{ status.label }}
                </li>
              </ul>
            </router-link>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import BottomBar from '../components/BottomBar.vue'
import DisciplineSelector from '../components/DisciplineSelector.vue'
import { useRulesetsQuery, useTricksQuery, VerificationLevel, VideoHost } from '../graphql/generated/graphql'
import { disciplineToSlug, languageLabel, queryDiscipline, TRICKTIONARY, trickSorter, trickTypeOf, trickVideoTypes, videoTypeNames } from '../helpers'
import useGrants, { verificationLevelRank } from '../hooks/useGrants'
import useLanguages from '../hooks/useLanguages'
import useTags from '../hooks/useTags'
import useTranslationLang from '../hooks/useTranslationLang'

import IconLoading from '~icons/mdi/loading'
import IconConfused from '~icons/mdi/map-marker-question-outline'
import IconPlus from '~icons/mdi/plus'
import IconTranslate from '~icons/mdi/translate'
import IconStairs from '~icons/mdi/stairs'
import IconVideo from '~icons/mdi/video-outline'

import type { Component } from 'vue'
import type { Discipline, TrickFilter, TricksQuery } from '../graphql/generated/graphql'

const { canEditTricks } = useGrants()
const { translatableLangs } = useLanguages()

const rulesetsQuery = useRulesetsQuery()
const rulesets = computed(() => rulesetsQuery.result.value?.rulesets ?? [])

/** Kept in the URL so the list survives a reload and can be linked to, a filter that is off leaves no trace */
const discipline = useRouteQuery<string | undefined, Discipline>('discipline', undefined, {
  transform: { get: queryDiscipline, set: disciplineToSlug }
})
const missingLang = useRouteQuery<string>('lang', '')
const levelRulesId = useRouteQuery<string>('rulesId', '')
const levelBelow = useRouteQuery<string>('level', '')
const withoutVideos = useRouteQuery<string | undefined, boolean>('videos', undefined, {
  transform: { get: value => value === 'none', set: without => without ? 'none' : undefined }
})
const missingRequiredTags = useRouteQuery<string | undefined, boolean>('tags', undefined, {
  transform: { get: value => value === 'missing', set: missing => missing ? 'missing' : undefined }
})

watch(levelRulesId, rulesId => { if (rulesId === '') levelBelow.value = '' })

const verifiedBelow: Record<string, VerificationLevel> = {
  judge: VerificationLevel.Judge,
  official: VerificationLevel.Official
}

const filter = computed<TrickFilter | null>(() => {
  const parts: TrickFilter = {}
  if (missingLang.value !== '') parts.missingLocalisation = missingLang.value
  if (levelRulesId.value !== '') {
    parts.level = { rulesId: levelRulesId.value, verifiedBelow: verifiedBelow[levelBelow.value] ?? null }
  }
  if (withoutVideos.value) parts.withoutVideos = true
  if (missingRequiredTags.value) parts.missingRequiredTags = true
  return Object.keys(parts).length === 0 ? null : parts
})

function clearFilters () {
  missingLang.value = ''
  levelRulesId.value = ''
  levelBelow.value = ''
  withoutVideos.value = false
  missingRequiredTags.value = false
}

/** Which language the cards report translation status for, nothing when empty */
const { lang: statusLang } = useTranslationLang()

/** Kept in the URL like the filters, once typing pauses */
const query = useRouteQuery<string>('q', '')
const search = ref(query.value)
const debouncedSearch = refDebounced(search, 1000)
watch(debouncedSearch, value => { query.value = value.trim() === '' ? '' : value })
// going back and forward
watch(query, value => { if (value !== debouncedSearch.value) search.value = value })
const searchQuery = computed(() => query.value.trim() === '' ? null : query.value.trim())

const tricksQuery = useTricksQuery(() => ({
  discipline: discipline.value,
  searchQuery: searchQuery.value,
  filter: filter.value,
  statusLang: statusLang.value === '' ? null : statusLang.value,
  withTranslation: statusLang.value !== ''
}), { fetchPolicy: 'cache-and-network' })

const loading = tricksQuery.loading
const tricks = computed(() => tricksQuery.result.value?.tricks ?? [])

/** Tricks the tricktionary hasn't levelled yet come after every numbered level */
function levelRank (level: string) {
  const rank = Number(level)
  return level === '' || Number.isNaN(rank) ? Number.MAX_SAFE_INTEGER : rank
}

const { trickTypes, trickTypeLabel } = useTags()

/** Tricks without a trick type come last */
function trickTypeRank (trickType: string) {
  return trickType === '' ? Number.MAX_SAFE_INTEGER : trickTypes(discipline.value).indexOf(trickType)
}

const levelGroups = computed(() => {
  const byLevel = new Map<string, Map<string, TricksQuery['tricks']>>()

  for (const trick of [...tricks.value].sort(trickSorter)) {
    const level = trick.levels.find(trickLevel => trickLevel.rulesId === TRICKTIONARY)?.level ?? ''
    let byType = byLevel.get(level)
    if (!byType) {
      byType = new Map()
      byLevel.set(level, byType)
    }
    const trickType = trickTypeOf(trick) ?? ''
    const group = byType.get(trickType) ?? []
    group.push(trick)
    byType.set(trickType, group)
  }

  return [...byLevel]
    .sort(([a], [b]) => levelRank(a) - levelRank(b))
    .map(([level, byType]) => ({
      level,
      label: level === '' ? 'No level' : `Level ${level}`,
      types: [...byType]
        .sort(([a], [b]) => trickTypeRank(a) - trickTypeRank(b))
        .map(([trickType, typeTricks]) => ({ trickType, label: trickType === '' ? 'No trick type' : trickTypeLabel(discipline.value, trickType), tricks: typeTricks }))
    }))
})

type Trick = TricksQuery['tricks'][number]
type StatusState = 'done' | 'partial' | 'missing'

interface TrickStatus {
  kind: 'translation' | 'level' | 'video'
  state: StatusState
  label: string
  title: string
  icon: Component
}

const statusClasses: Record<StatusState, string> = {
  done: 'border-line text-muted',
  partial: 'bg-ttyellow-500 border-ttyellow-500 text-black',
  missing: 'bg-ttred-500 border-ttred-900 text-white'
}

const verificationNames = ['unverified', 'judge verified', 'officially verified']

const primaryRuleset = computed(() => rulesets.value.find(ruleset => ruleset.isPrimary))

function translationStatus (trick: Trick): TrickStatus | undefined {
  if (statusLang.value === '') return
  const hasName = (trick.translation?.name.trim() ?? '') !== ''
  const hasDescription = (trick.translation?.description?.trim() ?? '') !== ''
  const title = `${languageLabel(statusLang.value)} translation`
  if (hasName && hasDescription) return { kind: 'translation', state: 'done', label: 'Translated', title, icon: IconTranslate }
  if (hasName) return { kind: 'translation', state: 'partial', label: 'No description', title, icon: IconTranslate }
  if (hasDescription) return { kind: 'translation', state: 'partial', label: 'No name', title, icon: IconTranslate }
  return { kind: 'translation', state: 'missing', label: 'Not translated', title, icon: IconTranslate }
}

function levelStatus (trick: Trick): TrickStatus | undefined {
  const ruleset = primaryRuleset.value
  if (!ruleset) return
  const title = `Level in ${ruleset.name}`
  const level = trick.levels.find(trickLevel => trickLevel.rulesId === ruleset.id)
  if (!level) return { kind: 'level', state: 'missing', label: 'No level', title, icon: IconStairs }
  const rank = verificationLevelRank(level.verificationLevel)
  return {
    kind: 'level',
    state: rank === 0 ? 'partial' : 'done',
    label: `Level ${level.level}, ${verificationNames[rank]}`,
    title,
    icon: IconStairs
  }
}

function videoStatus (trick: Trick): TrickStatus {
  const title = 'Videos'
  const trickVideo = trick.videos.find(video => video.host === VideoHost.Mux && trickVideoTypes.includes(video.type))
  if (trickVideo) {
    return { kind: 'video', state: 'done', label: videoTypeNames[trickVideo.type], title, icon: IconVideo }
  }
  if (trick.videos.length > 0) return { kind: 'video', state: 'partial', label: 'No Mux trick video', title, icon: IconVideo }
  return { kind: 'video', state: 'missing', label: 'No video', title, icon: IconVideo }
}

function trickStatuses (trick: Trick) {
  return [translationStatus(trick), levelStatus(trick), videoStatus(trick)].filter(status => status != null)
}

useHead({ title: 'Tricks' })
</script>
