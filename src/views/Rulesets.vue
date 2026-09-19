<template>
  <div class="container mx-auto pt-4 px-2">
    <div class="flex justify-between items-center gap-2 mb-4">
      <h1>Rulesets</h1>
      <button type="button" class="btn-primary w-max flex items-center gap-1" @click="openEditor(null)">
        <icon-plus aria-hidden="true" />
        New ruleset
      </button>
    </div>

    <p v-if="loading && !rulesets.length">
      Loading rulesets…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load rulesets: {{ error.message }}
    </p>
    <table v-else class="w-full border-collapse">
      <thead>
        <tr class="border-b border-line text-left">
          <th scope="col" class="py-2 pr-2">
            ID
          </th>
          <th scope="col" class="py-2 pr-2">
            Name
          </th>
          <th scope="col" class="py-2 pr-2">
            Other languages
          </th>
          <th scope="col" class="py-2 pr-2">
            Primary
          </th>
          <th scope="col" class="py-2 pr-2">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ruleset in rulesets" :key="ruleset.id" class="border-b border-line">
          <td class="py-2 pr-2">
            {{ ruleset.id }}
          </td>
          <td class="py-2 pr-2">
            {{ ruleset.name }}
          </td>
          <td class="py-2 pr-2">
            {{ otherNamesCount(ruleset) }}
          </td>
          <td class="py-2 pr-2">
            <span v-if="ruleset.isPrimary" class="rounded bg-ttyellow-500 text-black px-2 py-0.5 text-sm">
              Primary
            </span>
          </td>
          <td class="py-2 pr-2">
            <div class="flex gap-2">
              <button
                type="button"
                class="btn w-max"
                :aria-label="`Edit ${ruleset.id}`"
                @click="openEditor(ruleset)"
              >
                Edit
              </button>
              <button
                v-if="!ruleset.isPrimary"
                type="button"
                class="btn-primary w-max"
                :aria-label="`Set ${ruleset.id} as primary`"
                @click="setPrimary(ruleset)"
              >
                Set as primary
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <ruleset-dialog v-if="dialogOpen" :ruleset="dialogRuleset" @close="dialogOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref } from 'vue'
import RulesetDialog from '../components/RulesetDialog.vue'
import { useRulesetsWithNamesQuery, useSetPrimaryRulesetMutation } from '../graphql/generated/graphql'

import type { RulesetsWithNamesQuery } from '../graphql/generated/graphql'

type Ruleset = RulesetsWithNamesQuery['rulesets'][number]

const { result, loading, error } = useRulesetsWithNamesQuery()
const rulesets = computed(() => result.value?.rulesets ?? [])

const dialogRuleset = ref<Ruleset | null>(null)
const dialogOpen = ref(false)

const { mutate: setPrimaryRuleset } = useSetPrimaryRulesetMutation({
  refetchQueries: ['RulesetsWithNames', 'Rulesets']
})

function otherNamesCount (ruleset: Ruleset) {
  return ruleset.names.filter(name => name.lang !== 'en').length
}

function openEditor (ruleset: Ruleset | null) {
  dialogRuleset.value = ruleset
  dialogOpen.value = true
}

async function setPrimary (ruleset: Ruleset) {
  const confirmed = window.confirm(
    `Set "${ruleset.name}" as the primary ruleset? This changes what every visitor sees by default.`
  )
  if (!confirmed) return
  await setPrimaryRuleset({ rulesId: ruleset.id })
}

useHead({ title: 'Rulesets' })
</script>
