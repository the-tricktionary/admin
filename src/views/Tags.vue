<template>
  <div class="container mx-auto pt-4 px-2 pb-24">
    <div class="flex justify-between items-center gap-2 mb-4">
      <h1>Tags</h1>
      <button type="button" class="btn-primary w-max flex items-center gap-1" @click="openEditor(null)">
        <icon-plus aria-hidden="true" />
        New tag
      </button>
    </div>

    <p class="text-muted">
      Trick editors put these tags on tricks, translators translate their names. A change that would
      leave a tagged trick holding a value the tag no longer allows is refused.
    </p>

    <p v-if="loading && !tags.length">
      Loading tags…
    </p>
    <p v-else-if="error" role="alert" class="text-ttred-900">
      Failed to load tags: {{ error.message }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-line text-left">
            <th scope="col" class="py-2 pr-2">
              Name
            </th>
            <th scope="col" class="py-2 pr-2">
              Type
            </th>
            <th scope="col" class="py-2 pr-2">
              Disciplines
            </th>
            <th scope="col" class="py-2 pr-2">
              Tricks
            </th>
            <th scope="col" class="py-2 pr-2">
              Other languages
            </th>
            <th scope="col" class="py-2 pr-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in tags" :key="tag.id" class="border-b border-line align-top">
            <td class="py-2 pr-2">
              {{ tag.name }}
              <span v-if="tag.system" class="ml-1 rounded bg-ttyellow-500 text-black px-2 py-0.5 text-sm">
                Built in
              </span>
              <span class="block font-mono text-sm text-muted">#{{ tag.id }}</span>
            </td>
            <td class="py-2 pr-2">
              {{ tagValueTypeNames[tag.valueType] }}
              <span v-if="typeDetails(tag)" class="block text-sm text-muted">{{ typeDetails(tag) }}</span>
            </td>
            <td class="py-2 pr-2">
              {{ tag.disciplines.length ? tag.disciplines.map(discipline => disciplineNames[discipline]).join(', ') : 'All' }}
            </td>
            <td class="py-2 pr-2">
              {{ tag.trickCount }}
            </td>
            <td class="py-2 pr-2">
              {{ otherLanguages(tag) }}
            </td>
            <td class="py-2 pr-2">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="btn w-max"
                  :aria-label="`Edit ${tag.name}`"
                  @click="openEditor(tag)"
                >
                  Edit
                </button>
                <button
                  v-if="!tag.system"
                  type="button"
                  class="btn w-max"
                  :disabled="deleting === tag.id"
                  :aria-label="`Delete ${tag.name}`"
                  @click="remove(tag)"
                >
                  Delete
                </button>
              </div>
              <p v-if="errors.get(tag.id)" role="alert" class="text-ttred-900 text-sm mt-1">
                {{ errors.get(tag.id) }}
              </p>
            </td>
          </tr>
          <tr v-if="!tags.length">
            <td colspan="6" class="py-2 text-muted">
              No tags yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <tag-dialog v-if="dialogOpen" :tag="dialogTag" @close="dialogOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed, reactive, ref } from 'vue'
import TagDialog from '../components/TagDialog.vue'
import { TagValueType, useDeleteTagMutation, useTagsWithCountsQuery } from '../graphql/generated/graphql'
import { disciplineNames, tagValueTypeNames } from '../helpers'

import IconPlus from '~icons/mdi/plus'

import type { TagsWithCountsQuery } from '../graphql/generated/graphql'

type Tag = TagsWithCountsQuery['tags'][number]

const { result, loading, error } = useTagsWithCountsQuery({ fetchPolicy: 'cache-and-network' })
const tags = computed(() => result.value?.tags ?? [])

const dialogTag = ref<Tag | null>(null)
const dialogOpen = ref(false)
const deleting = ref<string | null>(null)
const errors = reactive(new Map<string, string>())

const { mutate: deleteTag } = useDeleteTagMutation({ throws: 'always', refetchQueries: ['TagsWithCounts', 'Tags'] })

function typeDetails (tag: Tag) {
  if (tag.valueType === TagValueType.Enum) {
    const names = tag.values.map(value => value.name).join(', ')
    return tag.multiple ? `${names} (several allowed)` : names
  }
  if (tag.valueType === TagValueType.Number) {
    const parts = []
    if (tag.min != null || tag.max != null) parts.push(`${tag.min ?? '…'} to ${tag.max ?? '…'}`)
    if (tag.step != null) parts.push(`step ${tag.step}`)
    return parts.join(', ')
  }
  return ''
}

function otherLanguages (tag: Tag) {
  const langs = tag.names.filter(name => name.lang !== 'en').map(name => name.lang)
  return langs.length ? langs.join(', ') : '–'
}

function openEditor (tag: Tag | null) {
  dialogTag.value = tag
  dialogOpen.value = true
}

async function remove (tag: Tag) {
  const tricks = tag.trickCount === 1 ? '1 trick' : `${tag.trickCount} tricks`
  if (!window.confirm(`Delete "${tag.name}"? It is removed from the ${tricks} carrying it.`)) return

  errors.delete(tag.id)
  deleting.value = tag.id
  try {
    await deleteTag({ tagId: tag.id })
  } catch (err) {
    errors.set(tag.id, err instanceof Error ? err.message : 'The tag could not be deleted')
  } finally {
    deleting.value = null
  }
}

useHead({ title: 'Tags' })
</script>
