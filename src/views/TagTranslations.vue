<template>
  <div class="container mx-auto pt-4 px-2 pb-24">
    <h1>Translations</h1>
    <translation-tabs />

    <p v-if="!langs.length" class="mt-4">
      There is no language for you to translate yet.
    </p>

    <template v-else>
      <div class="flex flex-wrap gap-4 items-end my-4">
        <div>
          <label for="tag-translation-lang" class="block text-sm text-muted">Language</label>
          <select id="tag-translation-lang" :value="lang" class="w-max block rounded border-line" @change="pickLang($event)">
            <option v-for="option of langs" :key="option" :value="option">
              {{ languageLabel(option) }}
            </option>
          </select>
        </div>

        <label class="flex items-center gap-2 pb-2">
          <input v-model="untranslatedOnly" type="checkbox">
          Show untranslated only
        </label>
      </div>

      <p v-if="error" role="alert" class="text-ttred-900">
        The tags could not be loaded: {{ error.message }}
      </p>

      <div v-else-if="loading && !tags.length" class="flex items-center justify-center flex-col" role="status">
        <icon-loading class="animate-spin w-32 h-32" aria-hidden="true" />
        Loading tags...
      </div>

      <p v-else-if="!cards.length" role="status">
        {{ tags.length ? 'Every tag is translated.' : 'There are no tags yet.' }}
      </p>

      <ul v-else class="list-none m-0 p-0 divide-y divide-solid divide-line">
        <li v-for="card of cards" :key="card.tagId" class="py-4">
          <p class="font-mono text-sm text-muted mb-1">
            #{{ card.tagId }}
          </p>
          <div v-for="row of card.rows" :key="row.key" class="grid sm:grid-cols-2 gap-x-4 items-center mb-2" :class="{ 'sm:pl-6': row.valueId != null }">
            <label :for="`tag-name-${row.key}`" lang="en">
              {{ row.english }}
              <span v-if="row.valueId == null" class="text-muted text-sm">(the tag)</span>
            </label>
            <input
              :id="`tag-name-${row.key}`"
              :lang="lang"
              :value="currentValue(row)"
              type="text"
              maxlength="60"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
              @input="edit(row.key, $event)"
            >
          </div>
        </li>
      </ul>
    </template>
  </div>

  <bottom-bar v-if="saveError">
    <p class="text-ttred-900" role="alert">
      {{ saveError }}
    </p>
  </bottom-bar>

  <bottom-bar>
    <div class="flex items-center gap-4 ml-auto">
      <span v-if="dirty" class="text-muted whitespace-nowrap">
        Unsaved changes
      </span>

      <button
        type="button"
        class="btn w-max whitespace-nowrap flex items-center gap-1"
        :disabled="!dirty || saving"
        @click="save()"
      >
        <icon-save aria-hidden="true" />
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </bottom-bar>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, ref, watch } from 'vue'
import BottomBar from '../components/BottomBar.vue'
import TranslationTabs from '../components/TranslationTabs.vue'
import { useSetTagLocalisationMutation, useTagsQuery } from '../graphql/generated/graphql'
import { languageLabel } from '../helpers'
import useTranslationLang from '../hooks/useTranslationLang'
import useUnsavedChanges from '../hooks/useUnsavedChanges'

import IconLoading from '~icons/mdi/loading'
import IconSave from '~icons/mdi/content-save-outline'

import type { TagLocalisationInput } from '../graphql/generated/graphql'

interface NameRow {
  /** `tagId` for the tag's own name, `tagId/valueId` for a value's */
  key: string
  tagId: string
  valueId: string | null
  english: string
  stored: string
}

const { editableLangs: langs, editLang: lang } = useTranslationLang()

const untranslatedOnly = ref(false)
/** The names that have been typed into, by row key */
const draft = ref<Record<string, string>>({})
const saving = ref(false)
const saveError = ref<string | null>(null)

const { result, loading, error, refetch } = useTagsQuery({ fetchPolicy: 'cache-and-network' })
const tags = computed(() => result.value?.tags ?? [])

function nameIn (names: ReadonlyArray<{ lang: string, value: string }>, forLang: string) {
  return names.find(name => name.lang === forLang)?.value ?? ''
}

const allRows = computed(() => tags.value.map(tag => ({
  tagId: tag.id,
  rows: [
    { key: tag.id, tagId: tag.id, valueId: null, english: tag.name, stored: nameIn(tag.names, lang.value) },
    ...tag.values.map(value => ({
      key: `${tag.id}/${value.id}`,
      tagId: tag.id,
      valueId: value.id,
      english: value.name,
      stored: nameIn(value.names, lang.value)
    }))
  ] satisfies NameRow[]
})))

function currentValue (row: NameRow) {
  return draft.value[row.key] ?? row.stored
}

// what needs work is judged on what is saved, so a card stays while it is being typed into
const cards = computed(() => allRows.value.filter(card => !untranslatedOnly.value || card.rows.some(row => row.stored === '')))

const changedRows = computed(() => allRows.value
  .flatMap(card => card.rows)
  .filter(row => draft.value[row.key] != null && draft.value[row.key].trim() !== row.stored))

const dirty = computed(() => changedRows.value.length > 0)
const { confirmDiscard } = useUnsavedChanges(dirty, 'This translation')

watch(lang, () => {
  draft.value = {}
  saveError.value = null
})

function edit (key: string, event: Event) {
  draft.value[key] = (event.target as HTMLInputElement).value
}

const { mutate: setTagLocalisation } = useSetTagLocalisationMutation({ throws: 'always' })

async function save () {
  if (!dirty.value || saving.value) return

  saving.value = true
  saveError.value = null

  const forLang = lang.value
  const byTag = new Map<string, TagLocalisationInput>()
  for (const row of changedRows.value) {
    const data = byTag.get(row.tagId) ?? {}
    const name = draft.value[row.key].trim()
    if (row.valueId == null) data.name = name
    else data.values = [...data.values ?? [], { id: row.valueId, name }]
    byTag.set(row.tagId, data)
  }

  const saved = new Set<string>()
  try {
    for (const [tagId, data] of byTag) {
      await setTagLocalisation({ tagId, lang: forLang, data })
      saved.add(tagId)
    }
  } catch (err) {
    saveError.value = errorMessage(err)
  }

  // drafts of tags that failed to save stay
  try {
    await refetch()
  } catch (err) {
    saveError.value ??= errorMessage(err)
  }
  if (forLang === lang.value) {
    draft.value = Object.fromEntries(Object.entries(draft.value).filter(([key]) => !saved.has(key.split('/')[0])))
  }
  saving.value = false
}

function errorMessage (err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong, please try again'
}

function pickLang (event: Event) {
  const select = event.target as HTMLSelectElement
  if (!confirmDiscard('Switch language')) {
    // the select is bound one way, so nothing else would put the old language back
    select.value = lang.value
    return
  }
  lang.value = select.value
}

useHead({ title: 'Tag names' })
</script>
