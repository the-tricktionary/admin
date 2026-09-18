<template>
  <dialog
    ref="dialog"
    aria-labelledby="user-grants-editor-title"
    class="bg-surface text-content border border-solid border-line rounded p-0 m-auto w-full max-w-160"
    @close="emit('close')"
  >
    <form class="p-4" @submit.prevent="save()">
      <h2 id="user-grants-editor-title">
        Grants for {{ name }}
      </h2>

      <ul class="list-none m-0 p-0 my-3">
        <li
          v-for="row of rows"
          :key="row.key"
          class="border border-solid border-line rounded p-2 mb-2 flex flex-wrap gap-2 items-end"
        >
          <div class="flex-auto min-w-36">
            <label :for="`grant-type-${row.key}`" class="block text-sm text-muted">
              Grant
            </label>
            <select :id="`grant-type-${row.key}`" v-model="row.type" class="w-full rounded">
              <option :value="GrantType.SuperAdmin">
                Super admin
              </option>
              <option :value="GrantType.TrickEditor">
                Trick editor
              </option>
              <option :value="GrantType.Translator">
                Translator
              </option>
              <option :value="GrantType.LevelEditor">
                Level editor
              </option>
            </select>
          </div>

          <div v-if="row.type === GrantType.Translator" class="flex-auto min-w-36">
            <label :for="`grant-lang-${row.key}`" class="block text-sm text-muted">
              Language
            </label>
            <input
              :id="`grant-lang-${row.key}`"
              v-model="row.lang"
              type="text"
              required
              pattern="[a-z]{2,3}(-[a-z0-9]{2,8})*"
              placeholder="sv"
              class="w-full rounded"
            >
          </div>

          <template v-if="row.type === GrantType.LevelEditor">
            <div class="flex-auto min-w-36">
              <label :for="`grant-rules-${row.key}`" class="block text-sm text-muted">
                Ruleset
              </label>
              <select :id="`grant-rules-${row.key}`" v-model="row.rulesId" required class="w-full rounded">
                <option v-for="ruleset of rulesets" :key="ruleset.id" :value="ruleset.id">
                  {{ ruleset.name }}
                </option>
              </select>
            </div>

            <div class="flex-auto min-w-36">
              <label :for="`grant-level-${row.key}`" class="block text-sm text-muted">
                Verification
              </label>
              <select :id="`grant-level-${row.key}`" v-model="row.verificationLevel" class="w-full rounded">
                <option :value="null">
                  May edit only
                </option>
                <option :value="VerificationLevel.Judge">
                  Judge
                </option>
                <option :value="VerificationLevel.Official">
                  Official
                </option>
              </select>
            </div>
          </template>

          <button
            type="button"
            class="rounded bg-surface border border-solid border-line px-3 py-2 cursor-pointer hover:bg-elevated"
            @click="remove(row)"
          >
            Remove
          </button>
        </li>
      </ul>

      <p v-if="rows.length === 0" class="text-muted">
        Without a grant this user cannot reach the admin interface.
      </p>

      <button
        type="button"
        class="rounded bg-surface border border-solid border-line px-3 py-2 cursor-pointer hover:bg-elevated"
        @click="add()"
      >
        Add grant
      </button>

      <p v-if="wouldLockOut" role="alert" class="text-ttred-900 mt-3">
        These are your own grants, and dropping your super admin grant would lock you out of this
        page, so it cannot be saved.
      </p>

      <p v-if="error" role="alert" class="text-ttred-900 mt-3">
        The grants could not be saved: {{ error.message }}
      </p>

      <div class="flex flex-wrap justify-end gap-2 mt-4">
        <button
          type="button"
          class="rounded bg-surface border border-solid border-line px-3 py-2 cursor-pointer hover:bg-elevated"
          @click="close()"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="wouldLockOut || saving"
          class="rounded bg-ttred-500 text-white border-none px-3 py-2 cursor-pointer hover:bg-ttred-900 disabled:cursor-default disabled:bg-elevated disabled:text-muted"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { GrantType, useRulesetsQuery, useSetUserGrantsMutation, VerificationLevel } from '../graphql/generated/graphql'
import useAuth from '../hooks/useAuth'

import type { FindUsersQuery, GrantInput } from '../graphql/generated/graphql'

type EditedUser = FindUsersQuery['findUsers'][number]

interface GrantRow {
  key: number
  type: GrantType
  lang: string
  rulesId: string
  verificationLevel: VerificationLevel | null
}

const { user } = defineProps<{ user: EditedUser }>()
const emit = defineEmits<{ close: [] }>()

const name = computed(() => user.name ?? user.username ?? user.email ?? user.id)

let nextKey = 0

const rows = ref<GrantRow[]>(user.grants.map(grant => ({
  key: nextKey++,
  type: grant.type,
  lang: grant.lang ?? '',
  rulesId: grant.rulesId ?? '',
  verificationLevel: grant.verificationLevel
})))

const { result: rulesetsResult } = useRulesetsQuery()
const rulesets = computed(() => rulesetsResult.value?.rulesets ?? [])
const defaultRulesId = computed(() => (rulesets.value.find(ruleset => ruleset.isPrimary) ?? rulesets.value[0])?.id ?? '')

/**
 * A level editor grant is meaningless without a ruleset, so one is picked for
 * a row that has just taken that type, and for a row that was waiting on the
 * rulesets to arrive.
 */
watch([rows, defaultRulesId], () => {
  for (const row of rows.value) {
    if (row.type === GrantType.LevelEditor && row.rulesId === '') row.rulesId = defaultRulesId.value
  }
}, { deep: true })

const { user: me } = useAuth()
const wouldLockOut = computed(() => me.value?.id === user.id && !rows.value.some(row => row.type === GrantType.SuperAdmin))

const { mutate, loading: saving, error } = useSetUserGrantsMutation({ throws: 'never' })

function add () {
  rows.value.push({
    key: nextKey++,
    type: GrantType.TrickEditor,
    lang: '',
    rulesId: '',
    verificationLevel: null
  })
}

function remove (row: GrantRow) {
  rows.value = rows.value.filter(other => other.key !== row.key)
}

function toInput (row: GrantRow): GrantInput {
  switch (row.type) {
    case GrantType.Translator:
      return { type: row.type, lang: row.lang }
    case GrantType.LevelEditor:
      return { type: row.type, rulesId: row.rulesId, verificationLevel: row.verificationLevel }
    default:
      return { type: row.type }
  }
}

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

function close () {
  dialog.value?.close()
}

async function save () {
  if (wouldLockOut.value) return
  const saved = await mutate({ userId: user.id, grants: rows.value.map(toInput) })
  if (saved?.data) close()
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
