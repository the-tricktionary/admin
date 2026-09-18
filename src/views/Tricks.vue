<template>
  <discipline-selector v-model:discipline="discipline" />

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
      class="btn w-max whitespace-nowrap"
      :to="{ name: 'trick-new', query: { discipline: disciplineToSlug(discipline) } }"
    >
      Create new
    </router-link>
  </bottom-bar>

  <div class="container mx-auto p-2 pb-20">
    <div v-if="loading && !tricks.length" class="flex items-center justify-center flex-col" role="status">
      <icon-loading class="animate-spin w-32 h-32" aria-hidden="true" />
      Loading tricks...
    </div>
    <div v-else-if="!tricks.length" class="flex items-center justify-center flex-col" role="status">
      <icon-confused class="w-32 h-32" aria-hidden="true" />
      No tricks match the discipline and search you picked.
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
            {{ typeGroup.trickType }}
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
              <span class="text-muted text-sm">{{ trick.trickType }}</span>
            </router-link>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import BottomBar from '../components/BottomBar.vue'
import DisciplineSelector from '../components/DisciplineSelector.vue'
import { useTricksQuery } from '../graphql/generated/graphql'
import { disciplineToSlug, queryDiscipline, trickSorter } from '../helpers'
import useGrants from '../hooks/useGrants'

import IconLoading from '~icons/mdi/loading'
import IconConfused from '~icons/mdi/map-marker-question-outline'

import type { Discipline, TricksQuery, TrickType } from '../graphql/generated/graphql'

const route = useRoute()
const router = useRouter()
const { canEditTricks } = useGrants()

/** Kept in the URL so the list survives a reload and can be linked to */
const discipline = computed<Discipline>({
  get: () => queryDiscipline(route.query.discipline),
  set: value => {
    void router.replace({ query: { ...route.query, discipline: disciplineToSlug(value) } })
  }
})

const search = ref('')
const debouncedSearch = refDebounced(search, 1000)
const searchQuery = computed(() => {
  const query = debouncedSearch.value.trim()
  return query === '' ? null : query
})

const tricksQuery = useTricksQuery(() => ({
  discipline: discipline.value,
  searchQuery: searchQuery.value
}), { fetchPolicy: 'cache-and-network' })

const loading = tricksQuery.loading
const tricks = computed(() => tricksQuery.result.value?.tricks ?? [])

/** Tricks the tricktionary hasn't levelled yet come after every numbered level */
function levelRank (level: string) {
  const rank = Number(level)
  return level === '' || Number.isNaN(rank) ? Number.MAX_SAFE_INTEGER : rank
}

const levelGroups = computed(() => {
  const byLevel = new Map<string, Map<TrickType, TricksQuery['tricks']>>()

  for (const trick of [...tricks.value].sort(trickSorter)) {
    const level = trick.ttLevels[0]?.level ?? ''
    let byType = byLevel.get(level)
    if (!byType) {
      byType = new Map()
      byLevel.set(level, byType)
    }
    const group = byType.get(trick.trickType) ?? []
    group.push(trick)
    byType.set(trick.trickType, group)
  }

  return [...byLevel]
    .sort(([a], [b]) => levelRank(a) - levelRank(b))
    .map(([level, byType]) => ({
      level,
      label: level === '' ? 'No level' : `Level ${level}`,
      types: [...byType]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([trickType, typeTricks]) => ({ trickType, tricks: typeTricks }))
    }))
})

useHead({ title: 'Tricks' })
</script>
