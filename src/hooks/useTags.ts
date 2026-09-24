import { computed } from 'vue'
import { useTagsQuery } from '../graphql/generated/graphql'
import { tagInput, TRICK_TYPE_SLUG } from '../helpers'

import type { Discipline } from '../graphql/generated/graphql'
import type { TagRow } from '../helpers'

export default function useTags () {
  const { result } = useTagsQuery()
  const tags = computed(() => result.value?.tags ?? [])
  const tagsById = computed(() => new Map(tags.value.map(tag => [tag.id, tag])))

  function appliesTo (tagId: string, discipline: Discipline) {
    const disciplines = tagsById.value.get(tagId)?.disciplines ?? []
    return disciplines.length === 0 || disciplines.includes(discipline)
  }

  function trickTypeTag (discipline: Discipline) {
    return tags.value.find(tag => tag.slug === TRICK_TYPE_SLUG && appliesTo(tag.id, discipline))
  }

  /** The IDs of the discipline's trick type values, in order */
  function trickTypes (discipline: Discipline) {
    return trickTypeTag(discipline)?.values.map(value => value.id) ?? []
  }

  function trickTypeLabel (discipline: Discipline, trickType: string) {
    return trickTypeTag(discipline)?.values.find(value => value.id === trickType)?.name ?? trickType
  }

  function requiredOn (tagId: string, discipline: Discipline) {
    return tagsById.value.get(tagId)?.required === true && appliesTo(tagId, discipline)
  }

  /** What a trick of the discipline is to hold, the rows that don't apply to it left out */
  function tagInputs (rows: TagRow[], discipline: Discipline) {
    return rows.filter(row => appliesTo(row.tagId, discipline)).map(tagInput)
  }

  return { tags, tagsById, trickTypes, trickTypeLabel, appliesTo, requiredOn, tagInputs }
}
