<template>
  <div class="container mx-auto pt-4 px-2 pb-24">
    <h1>Translations</h1>

    <p v-if="!langs.length" class="mt-4">
      There is no language for you to translate yet.
    </p>

    <template v-else>
      <div class="flex flex-wrap gap-4 items-end my-4">
        <div>
          <label for="translation-lang" class="block text-sm text-muted">Language</label>
          <select id="translation-lang" :value="lang" class="w-max block rounded border-line" @change="pickLang($event)">
            <option v-for="option of langs" :key="option" :value="option">
              {{ languageLabel(option) }}
            </option>
          </select>
        </div>

        <div class="flex-auto max-w-120">
          <label for="translation-filter" class="block text-sm text-muted">Filter</label>
          <input
            id="translation-filter"
            v-model="filter"
            type="search"
            placeholder="Filter keys and text"
            class="w-full rounded"
          >
        </div>

        <label class="flex items-center gap-2 pb-2">
          <input v-model="needsWorkOnly" type="checkbox">
          Show untranslated and outdated only
        </label>
      </div>

      <p v-if="englishError" role="alert" class="text-ttred-900">
        The English messages could not be loaded: {{ englishError }}
      </p>
      <p v-else-if="error" role="alert" class="text-ttred-900">
        The translation could not be loaded: {{ error.message }}
      </p>

      <div v-else-if="loading" class="flex items-center justify-center flex-col" role="status">
        <icon-loading class="animate-spin w-32 h-32" aria-hidden="true" />
        Loading messages...
      </div>

      <template v-else>
        <div v-if="!rows.length" class="flex items-center justify-center flex-col" role="status">
          <icon-confused class="w-32 h-32" aria-hidden="true" />
          No messages match the filter you picked.
        </div>

        <ul v-else class="list-none m-0 p-0 divide-y divide-solid divide-line">
          <li v-for="row of rows" :key="row.key" class="py-4">
            <p class="font-mono text-sm text-muted mb-1">
              {{ row.key }}
              <span v-if="row.outdated" class="ml-2 rounded bg-ttyellow-500 text-black px-1.5 py-0.5 text-xs font-sans">
                English has changed
              </span>
              <button
                v-if="row.outdated"
                type="button"
                class="ml-2 text-xs font-sans underline cursor-pointer text-link hover:text-link-hover disabled:text-muted"
                :disabled="keeping === row.key"
                @click="keepCurrent(row.key)"
              >
                Still correct
              </button>
            </p>
            <p lang="en" class="whitespace-pre-line mb-2">
              {{ row.english }}
            </p>
            <p v-if="row.outdated" lang="en" class="whitespace-pre-line text-muted text-sm mb-2">
              Translated from: {{ row.wasEnglish }}
            </p>
            <label :for="`message-${row.key}`" class="sr-only">{{ languageName(lang) }}</label>
            <textarea
              v-if="row.long"
              :id="`message-${row.key}`"
              :lang="lang"
              :value="row.value"
              rows="3"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
              @input="edit(row.key, $event)"
            />
            <input
              v-else
              :id="`message-${row.key}`"
              :lang="lang"
              :value="row.value"
              type="text"
              class="w-full block rounded focus:border-b-ttred-900 border-line"
              @input="edit(row.key, $event)"
            >
            <p v-if="row.credit" class="text-muted text-sm mt-1 mb-0">
              {{ row.credit }}
            </p>
          </li>
        </ul>

        <section v-if="unusedRows.length" class="mt-6">
          <h2 class="mb-2">
            Keys no longer in use
          </h2>

          <ul class="list-none m-0 p-0 divide-y divide-solid divide-line">
            <li v-for="row of unusedRows" :key="row.key" class="py-4 flex flex-wrap gap-4 items-start">
              <div class="flex-auto">
                <p class="font-mono text-sm text-muted mb-1">
                  {{ row.key }}
                </p>
                <p :lang="lang" class="whitespace-pre-line mb-0">
                  {{ row.value }}
                </p>
                <p v-if="row.credit" class="text-muted text-sm mt-1 mb-0">
                  {{ row.credit }}
                </p>
              </div>
              <button
                type="button"
                class="btn w-max"
                :disabled="removing === row.key"
                :aria-label="`Remove ${row.key}`"
                @click="remove(row.key)"
              >
                Remove
              </button>
            </li>
          </ul>
        </section>
      </template>
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
import { useEventListener } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import BottomBar from '../components/BottomBar.vue'
import { useSetUiMessagesMutation, useUiMessageEntriesQuery } from '../graphql/generated/graphql'
import { languageLabel, languageName } from '../helpers'
import useTranslationLang from '../hooks/useTranslationLang'

import IconLoading from '~icons/mdi/loading'
import IconSave from '~icons/mdi/content-save-outline'
import IconConfused from '~icons/mdi/map-marker-question-outline'

import type { UiMessageEntriesQuery, UiMessageInput } from '../graphql/generated/graphql'

type Entry = UiMessageEntriesQuery['uiMessageEntries'][number]

interface EnglishMessage {
  key: string
  value: string
}

/** Text long enough that a single line input would hide most of it */
const LONG_MESSAGE = 80

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

const { editableLangs: langs, editLang: lang } = useTranslationLang()

const filter = ref('')
const needsWorkOnly = ref(false)

const english = ref<EnglishMessage[]>([])
const englishLoading = ref(true)
const englishError = ref<string | null>(null)

/** What the language held when it was loaded, or last saved, by key */
const loaded = ref(new Map<string, Entry>())
/** The language `loaded` holds, so a half-switched page isn't read as an empty translation */
const loadedLang = ref('')
/** The messages that have been typed into, by key */
const draft = ref<Record<string, string>>({})

const saving = ref(false)
const saveError = ref<string | null>(null)
const removing = ref<string | null>(null)
const keeping = ref<string | null>(null)

function errorMessage (err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong, please try again'
}

function flatten (node: unknown, prefix: string, into: EnglishMessage[]) {
  if (typeof node === 'string') {
    into.push({ key: prefix, value: node })
  } else if (typeof node === 'object' && node !== null) {
    for (const [key, child] of Object.entries(node)) flatten(child, prefix === '' ? key : `${prefix}.${key}`, into)
  }
}

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_WEB_URL}/locales/en.json`)
    if (!response.ok) throw new Error(`the site answered ${response.status}`)
    const messages: EnglishMessage[] = []
    flatten(await response.json(), '', messages)
    english.value = messages.sort((a, b) => a.key.localeCompare(b.key))
  } catch (err) {
    englishError.value = errorMessage(err)
  } finally {
    englishLoading.value = false
  }
})

const englishByKey = computed(() => new Map(english.value.map(message => [message.key, message.value])))

function storedValue (key: string) {
  return loaded.value.get(key)?.value ?? ''
}

/**
 * Whether the site has reworded the English since this was translated. A
 * translation saved before we started recording the English it was made from
 * cannot be judged, so it is left alone rather than flagged.
 */
function outdated (key: string) {
  const source = loaded.value.get(key)?.source
  return source != null && source.trim() !== (englishByKey.value.get(key)?.trim() ?? '')
}

function currentValue (key: string) {
  return draft.value[key] ?? storedValue(key)
}

const changes = computed<UiMessageInput[]>(() => Object.entries(draft.value)
  .filter(([key, value]) => value !== storedValue(key))
  .map(([key, value]) => value === ''
    ? { key, value: null }
    : { key, value, source: englishByKey.value.get(key) ?? null })
)

const dirty = computed(() => changes.value.length > 0)

const entriesQuery = useUiMessageEntriesQuery(
  () => ({ lang: lang.value }),
  () => ({ enabled: lang.value !== '', fetchPolicy: 'cache-and-network' })
)

const error = entriesQuery.error
const loading = computed(() => englishLoading.value || loadedLang.value !== lang.value)

entriesQuery.onResult(result => {
  if (result.loading) return
  const variables = entriesQuery.variables.value
  if (variables?.lang !== lang.value) return
  // a fresh read of the language being edited must not throw away what is being typed
  if (variables.lang === loadedLang.value && dirty.value) return

  loaded.value = new Map((result.data?.uiMessageEntries ?? []).map(entry => [entry.key, entry]))
  loadedLang.value = variables.lang
  draft.value = {}
})

watch(lang, () => {
  draft.value = {}
  saveError.value = null
})

function edit (key: string, event: Event) {
  draft.value[key] = (event.target as HTMLInputElement | HTMLTextAreaElement).value
}

function credit (key: string) {
  const entry = loaded.value.get(key)
  if (!entry) return null
  const name = entry.updatedBy?.name ?? entry.updatedBy?.username ?? 'someone'
  return `by ${name}, ${dateFormat.format(entry.updatedAt)}`
}

function matchesFilter (...texts: string[]) {
  const needle = filter.value.trim().toLowerCase()
  return needle === '' || texts.some(text => text.toLowerCase().includes(needle))
}

const rows = computed(() => english.value
  .map(message => ({
    key: message.key,
    english: message.value,
    wasEnglish: loaded.value.get(message.key)?.source,
    outdated: outdated(message.key),
    value: currentValue(message.key),
    long: message.value.length > LONG_MESSAGE,
    credit: credit(message.key)
  }))
  // what needs work is judged on what is saved, so a row stays while it is being typed into
  .filter(row => (!needsWorkOnly.value || storedValue(row.key) === '' || row.outdated) && matchesFilter(row.key, row.english, row.value))
)

const englishKeys = computed(() => new Set(english.value.map(message => message.key)))

/** Translations of keys the site has since dropped, which only the filter hides */
const unusedRows = computed(() => englishKeys.value.size === 0
  ? []
  : [...loaded.value.values()]
      .filter(entry => !englishKeys.value.has(entry.key))
      .map(entry => ({ key: entry.key, value: entry.value, credit: credit(entry.key) }))
      .filter(row => matchesFilter(row.key, row.value))
      .sort((a, b) => a.key.localeCompare(b.key))
)

const { mutate: setUiMessages } = useSetUiMessagesMutation({ throws: 'always' })

function reconcile (forLang: string, sent: UiMessageInput[], entries: readonly Entry[]) {
  if (forLang !== loadedLang.value) return

  const next = new Map(loaded.value)
  for (const change of sent) next.delete(change.key)
  for (const entry of entries) next.set(entry.key, entry)
  loaded.value = next

  // anything typed while the save was in flight still needs saving
  const saved = new Set(sent.filter(change => draft.value[change.key] === (change.value ?? '')).map(change => change.key))
  draft.value = Object.fromEntries(Object.entries(draft.value).filter(([key]) => !saved.has(key)))
}

async function save () {
  if (!dirty.value || saving.value) return

  saving.value = true
  saveError.value = null

  const forLang = lang.value
  const sent = changes.value

  try {
    const result = await setUiMessages({ lang: forLang, entries: sent })
    reconcile(forLang, sent, result?.data?.setUiMessages ?? [])
  } catch (err) {
    saveError.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

/** Keeps the translation as it reads and records the English it now answers to */
async function keepCurrent (key: string) {
  keeping.value = key
  saveError.value = null

  const forLang = lang.value
  const sent: UiMessageInput[] = [{ key, value: currentValue(key), source: englishByKey.value.get(key) ?? null }]

  try {
    const result = await setUiMessages({ lang: forLang, entries: sent })
    reconcile(forLang, sent, result?.data?.setUiMessages ?? [])
  } catch (err) {
    saveError.value = errorMessage(err)
  } finally {
    keeping.value = null
  }
}

async function remove (key: string) {
  if (!window.confirm(`Remove the translation of "${key}"?`)) return

  removing.value = key
  saveError.value = null

  const forLang = lang.value
  const sent: UiMessageInput[] = [{ key, value: null }]

  try {
    const result = await setUiMessages({ lang: forLang, entries: sent })
    reconcile(forLang, sent, result?.data?.setUiMessages ?? [])
  } catch (err) {
    saveError.value = errorMessage(err)
  } finally {
    removing.value = null
  }
}

function pickLang (event: Event) {
  const select = event.target as HTMLSelectElement
  if (dirty.value && !window.confirm('This translation has changes that have not been saved yet. Switch language anyway?')) {
    // the select is bound one way, so nothing else would put the old language back
    select.value = lang.value
    return
  }
  lang.value = select.value
}

onBeforeRouteLeave(() => !dirty.value || window.confirm('This translation has changes that have not been saved yet. Leave the page anyway?'))

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (!dirty.value) return
  event.preventDefault()
})

useHead({ title: 'Translations' })
</script>
