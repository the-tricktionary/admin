<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="bg-surface text-content rounded border border-line p-0 m-auto w-full max-w-2xl"
    @close="emit('close')"
    @cancel="event => { if (saving) event.preventDefault() }"
  >
    <form class="p-4 flex flex-col gap-3" @submit.prevent="save()">
      <h2 :id="titleId">
        {{ notice ? 'Edit notice' : 'New notice' }}
      </h2>

      <fieldset :disabled="saving" class="border-none p-0 m-0 flex flex-col gap-3">
        <div class="grid sm:grid-cols-2 gap-x-4">
          <form-field id="notice-from" label="From (optional, shown straight away when empty)">
            <template #default="field">
              <input
                v-bind="field"
                v-model="from"
                type="datetime-local"
                :max="until"
                class="w-full block rounded border-line"
              >
            </template>
          </form-field>

          <form-field id="notice-until" label="Until (optional, shown indefinitely when empty)">
            <template #default="field">
              <input
                v-bind="field"
                v-model="until"
                type="datetime-local"
                :min="from"
                class="w-full block rounded border-line"
              >
            </template>
          </form-field>
        </div>

        <form-field id="notice-body" label="Message" lang="en">
          <template #default="field">
            <textarea
              v-bind="field"
              v-model="body"
              required
              rows="4"
              maxlength="1000"
              class="w-full block rounded border-line"
            />
          </template>
        </form-field>

        <fieldset class="border-none p-0 m-0 mb-4">
          <legend class="mb-1">
            Links
          </legend>
          <div v-for="(link, index) of links" :key="index" class="flex flex-wrap gap-2 mb-2">
            <label :for="`notice-link-url-${index}`" class="sr-only">
              Link {{ index + 1 }} address
            </label>
            <input
              :id="`notice-link-url-${index}`"
              v-model="link.url"
              type="text"
              required
              pattern="/(?!/)\S*|https?://\S+|mailto:[^\s@/]+@[^\s@/]+"
              placeholder="/tricks, https://example.com or mailto:hello@example.com"
              class="flex-1 min-w-48 block rounded border-line font-mono"
            >
            <label :for="`notice-link-label-${index}`" class="sr-only">
              Link {{ index + 1 }} label
            </label>
            <input
              :id="`notice-link-label-${index}`"
              v-model="link.label"
              type="text"
              required
              lang="en"
              placeholder="Read more"
              class="flex-1 min-w-32 block rounded border-line"
            >
            <button
              type="button"
              class="btn w-max"
              :aria-label="`Remove link ${index + 1}`"
              @click="removeLink(index)"
            >
              <icon-delete aria-hidden="true" />
            </button>
          </div>
          <button type="button" class="btn w-max" :disabled="links.length >= MAX_LINKS" @click="addLink()">
            Add link
          </button>
        </fieldset>

        <template v-if="editableLangs.length">
          <div class="flex flex-wrap items-center gap-x-4">
            <h3 class="font-semibold">
              Translation
            </h3>
            <label for="notice-translation-lang" class="sr-only">Language</label>
            <select
              id="notice-translation-lang"
              v-model="editLang"
              :disabled="editableLangs.length === 1"
              class="w-max block rounded border-line"
            >
              <option v-for="option of editableLangs" :key="option" :value="option">
                {{ languageLabel(option) }}
              </option>
            </select>
          </div>

          <template v-if="draft">
            <form-field
              id="notice-translation-body"
              label="Message (leave empty to skip this language)"
              :lang="editLang"
            >
              <template #default="field">
                <textarea
                  v-bind="field"
                  v-model="draft.body"
                  rows="4"
                  maxlength="1000"
                  class="w-full block rounded border-line"
                />
              </template>
            </form-field>

            <fieldset v-if="links.length" class="border-none p-0 m-0 mb-4">
              <legend class="mb-1">
                Link labels
              </legend>
              <div v-for="(link, index) of links" :key="index" class="mb-2">
                <label :for="`notice-translation-label-${index}`" class="sr-only">
                  Link {{ index + 1 }} label
                </label>
                <input
                  :id="`notice-translation-label-${index}`"
                  v-model="draft.linkLabels[index]"
                  type="text"
                  :required="translated"
                  :lang="editLang"
                  :placeholder="link.label"
                  class="w-full block rounded border-line"
                >
              </div>
            </fieldset>
          </template>
        </template>
      </fieldset>

      <p v-if="error" role="alert" class="text-ttred-900">
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn w-max" :disabled="saving" @click="dialog?.close()">
          Cancel
        </button>
        <button type="submit" class="btn-primary w-max" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId, useTemplateRef, watch } from 'vue'
import FormField from './FormField.vue'
import { useCreateNoticeMutation, useUpdateNoticeMutation } from '../graphql/generated/graphql'
import { fromDatetimeLocal, languageLabel, toDatetimeLocal } from '../helpers'
import useTranslationLang from '../hooks/useTranslationLang'

import IconDelete from '~icons/mdi/delete-outline'

import type { NoticeRowFragment } from '../graphql/generated/graphql'

const MAX_LINKS = 5

const { notice = null } = defineProps<{
  /** The notice being edited, or null to create a new one */
  notice?: NoticeRowFragment | null
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = useTemplateRef('dialog')
const titleId = useId()

const { editableLangs, editLang } = useTranslationLang()

const english = notice?.texts.find(text => text.lang === 'en')

const from = ref(notice?.from == null ? '' : toDatetimeLocal(notice.from))
const until = ref(notice?.until == null ? '' : toDatetimeLocal(notice.until))
const body = ref(english?.body ?? '')
const links = ref<Array<{ url: string, label: string }>>(english?.links.map(link => ({ url: link.url, label: link.label })) ?? [])

interface NoticeDraft {
  body: string
  linkLabels: string[]
}

// one draft per visited language, so switching languages keeps what was typed
const drafts = reactive<Record<string, NoticeDraft>>(Object.fromEntries(
  notice?.texts
    .filter(text => text.lang !== 'en')
    .map(text => [text.lang, { body: text.body, linkLabels: text.links.map(link => link.label) }]) ?? []
))

const draft = computed(() => drafts[editLang.value] ?? null)

/** A language is only sent once it has a message, and then it needs every label */
const translated = computed(() => (draft.value?.body.trim() ?? '') !== '')

watch(editLang, lang => {
  if (lang !== '' && !drafts[lang]) drafts[lang] = { body: '', linkLabels: links.value.map(() => '') }
}, { immediate: true })

const error = ref<string | null>(null)
const saving = ref(false)

const { mutate: createNotice } = useCreateNoticeMutation({ throws: 'always', refetchQueries: ['AllNotices'] })
const { mutate: updateNotice } = useUpdateNoticeMutation({ throws: 'always', refetchQueries: ['AllNotices'] })

function addLink () {
  links.value.push({ url: '', label: '' })
  for (const other of Object.values(drafts)) other.linkLabels.push('')
}

function removeLink (index: number) {
  links.value.splice(index, 1)
  for (const other of Object.values(drafts)) other.linkLabels.splice(index, 1)
}

async function save () {
  error.value = null
  saving.value = true
  try {
    const data = {
      from: fromDatetimeLocal(from.value),
      until: fromDatetimeLocal(until.value),
      linkUrls: links.value.map(link => link.url.trim()),
      texts: [
        { lang: 'en', body: body.value.trim(), linkLabels: links.value.map(link => link.label.trim()) },
        // an empty list of languages is one still loading, not a site without any
        ...Object.entries(drafts)
          .filter(([lang, other]) => other.body.trim() !== '' && (editableLangs.value.length === 0 || editableLangs.value.includes(lang)))
          .map(([lang, other]) => ({ lang, body: other.body.trim(), linkLabels: other.linkLabels.map(label => label.trim()) }))
      ]
    }
    if (notice) await updateNotice({ noticeId: notice.id, data })
    else await createNotice({ data })
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong, please try again'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  dialog.value?.showModal()
})
</script>
