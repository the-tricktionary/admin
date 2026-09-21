<template>
  <div class="container mx-auto pt-4 px-2">
    <div class="flex justify-between items-center gap-2 mb-4">
      <h1>Notices</h1>
      <button type="button" class="btn-primary w-max" @click="openEditor(null)">
        New notice
      </button>
    </div>

    <p class="text-muted mb-4">
      Messages shown on the public site's home page, above the discipline
      selector, until a visitor closes them. A notice can carry a few links and
      be scheduled to appear and disappear on its own; English is what everyone
      without a translation reads.
    </p>

    <p v-if="loading && !notices.length">
      Loading notices…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load notices: {{ error.message }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-line text-left">
            <th scope="col" class="py-2 pr-2">
              Message
            </th>
            <th scope="col" class="py-2 pr-2">
              Schedule
            </th>
            <th scope="col" class="py-2 pr-2">
              Languages
            </th>
            <th scope="col" class="py-2 pr-2">
              Status
            </th>
            <th scope="col" class="py-2 pr-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="notice of notices" :key="notice.id" class="border-b border-line">
            <td class="py-2 pr-2">
              <span class="block truncate max-w-md">{{ englishBody(notice) }}</span>
            </td>
            <td class="py-2 pr-2">
              {{ formatSchedule(notice) }}
            </td>
            <td class="py-2 pr-2">
              {{ notice.texts.map(text => text.lang).join(', ') }}
            </td>
            <td class="py-2 pr-2">
              {{ status(notice) }}
            </td>
            <td class="py-2 pr-2">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="btn w-max"
                  :aria-label="`Edit ${summary(notice)}`"
                  @click="openEditor(notice)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn w-max"
                  :disabled="deleting === notice.id"
                  :aria-label="`Delete ${summary(notice)}`"
                  @click="remove(notice)"
                >
                  Delete
                </button>
              </div>
              <p v-if="errors.get(notice.id)" role="alert" class="text-ttred-900 text-sm mt-1">
                {{ errors.get(notice.id) }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <notice-dialog
      v-if="dialogOpen"
      :notice="dialogNotice"
      @close="dialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, reactive, ref } from 'vue'
import NoticeDialog from '../components/NoticeDialog.vue'
import { useAllNoticesQuery, useDeleteNoticeMutation } from '../graphql/generated/graphql'

import type { NoticeRowFragment } from '../graphql/generated/graphql'

const { result, loading, error } = useAllNoticesQuery({ fetchPolicy: 'cache-and-network' })
const notices = computed(() => result.value?.allNotices ?? [])

const dialogNotice = ref<NoticeRowFragment | null>(null)
const dialogOpen = ref(false)

const deleting = ref<string | null>(null)
const errors = reactive(new Map<string, string>())

const { mutate: deleteNotice } = useDeleteNoticeMutation({ throws: 'always', refetchQueries: ['AllNotices'] })

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function englishBody (notice: NoticeRowFragment) {
  return notice.texts.find(text => text.lang === 'en')?.body ?? ''
}

/** The opening of the message, to name a notice in prompts and labels */
function summary (notice: NoticeRowFragment) {
  const body = englishBody(notice)
  return body.length > 40 ? `“${body.slice(0, 40)}…”` : `“${body}”`
}

function formatSchedule (notice: NoticeRowFragment) {
  const from = notice.from == null ? null : dateFormat.format(notice.from)
  const until = notice.until == null ? null : dateFormat.format(notice.until)
  if (from && until) return `${from} – ${until}`
  if (from) return `From ${from}`
  if (until) return `Until ${until}`
  return 'Always'
}

function status (notice: NoticeRowFragment) {
  const now = Date.now()
  if (notice.until != null && notice.until <= now) return 'Expired'
  if (notice.from != null && notice.from > now) return 'Scheduled'
  return 'Live'
}

function openEditor (notice: NoticeRowFragment | null) {
  dialogNotice.value = notice
  dialogOpen.value = true
}

async function remove (notice: NoticeRowFragment) {
  const confirmed = window.confirm(`Delete ${summary(notice)}?`)
  if (!confirmed) return
  errors.delete(notice.id)
  deleting.value = notice.id
  try {
    await deleteNotice({ noticeId: notice.id })
  } catch (err) {
    errors.set(notice.id, err instanceof Error ? err.message : 'The notice could not be deleted')
  } finally {
    deleting.value = null
  }
}

useHead({ title: 'Notices' })
</script>
