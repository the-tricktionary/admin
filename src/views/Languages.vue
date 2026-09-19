<template>
  <div class="container mx-auto pt-4 px-2">
    <div class="flex justify-between items-center gap-2 mb-4">
      <h1>Languages</h1>
      <button type="button" class="btn-primary w-max flex items-center gap-1" @click="dialogOpen = true">
        <icon-plus aria-hidden="true" />
        New language
      </button>
    </div>

    <p v-if="loading && !languages.length">
      Loading languages…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load languages: {{ error.message }}
    </p>
    <table v-else class="w-full border-collapse">
      <thead>
        <tr class="border-b border-line text-left">
          <th scope="col" class="py-2 pr-2">
            Tag
          </th>
          <th scope="col" class="py-2 pr-2">
            Name
          </th>
          <th scope="col" class="py-2 pr-2">
            Enabled
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="language of languages" :key="language.id" class="border-b border-line">
          <td class="py-2 pr-2">
            {{ language.id }}
          </td>
          <td class="py-2 pr-2">
            {{ languageName(language.id) }}
          </td>
          <td class="py-2 pr-2">
            <input
              type="checkbox"
              :checked="language.enabled"
              :disabled="saving === language.id"
              :aria-label="`Offer ${languageLabel(language.id)} on the public site`"
              @change="toggle(language, $event)"
            >
            <p v-if="errors.get(language.id)" role="alert" class="text-ttred-900 text-sm">
              {{ errors.get(language.id) }}
            </p>
          </td>
        </tr>
      </tbody>
    </table>

    <language-dialog v-if="dialogOpen" @close="dialogOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { ref } from 'vue'
import LanguageDialog from '../components/LanguageDialog.vue'
import { useSetLanguageEnabledMutation } from '../graphql/generated/graphql'
import { languageLabel, languageName } from '../helpers'

import IconPlus from '~icons/mdi/plus'
import useLanguages from '../hooks/useLanguages'

import type { LanguagesQuery } from '../graphql/generated/graphql'

type Language = LanguagesQuery['languages'][number]

const { languages, loading, error } = useLanguages()

const dialogOpen = ref(false)
const saving = ref<string | null>(null)
const errors = ref(new Map<string, string>())

const { mutate: setLanguageEnabled } = useSetLanguageEnabledMutation()

async function toggle (language: Language, event: Event) {
  const checkbox = event.target as HTMLInputElement
  errors.value.delete(language.id)
  saving.value = language.id
  try {
    await setLanguageEnabled({ lang: language.id, enabled: checkbox.checked })
  } catch (err) {
    // the query still holds the old value, so nothing would re-render the box
    checkbox.checked = language.enabled
    errors.value.set(language.id, err instanceof Error ? err.message : 'Something went wrong, please try again')
  } finally {
    saving.value = null
  }
}

useHead({ title: 'Languages' })
</script>
