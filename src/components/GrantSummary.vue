<template>
  <ul v-if="grants.length" class="list-none m-0 p-0">
    <li v-for="grant of grants" :key="`${grant.type}:${grant.lang}:${grant.rulesId}`">
      {{ label(grant) }}
    </li>
  </ul>
  <span v-else class="text-muted">
    None
  </span>
</template>

<script setup lang="ts">
import { GrantType } from '../graphql/generated/graphql'
import { grantTypeNames } from '../helpers'

import type { FindUsersQuery } from '../graphql/generated/graphql'

type Grant = FindUsersQuery['findUsers'][number]['grants'][number]

const { grants } = defineProps<{ grants: Grant[] }>()

function label (grant: Grant) {
  const name = grantTypeNames[grant.type]
  switch (grant.type) {
    case GrantType.Translator:
      return `${name}: ${grant.lang ?? '?'}`
    case GrantType.LevelEditor: {
      const level = grant.verificationLevel == null ? '' : ` (${grant.verificationLevel})`
      return `${name}: ${grant.rulesId ?? '?'}${level}`
    }
    default:
      return name
  }
}
</script>
