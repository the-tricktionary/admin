import { computed } from 'vue'
import { TrickType, useTagsQuery } from '../graphql/generated/graphql'
import { TRICK_TYPE_TAG } from '../helpers'

import type { Discipline } from '../graphql/generated/graphql'

function isTrickType (id: string): id is TrickType {
  return (Object.values(TrickType) as string[]).includes(id)
}

export default function useTags () {
  const { result } = useTagsQuery()
  const tagsById = computed(() => new Map((result.value?.tags ?? []).map(tag => [tag.id, tag])))

  /** In the trick type tag's order */
  const trickTypes = computed(() => {
    const ordered = tagsById.value.get(TRICK_TYPE_TAG)?.values.map(value => value.id).filter(isTrickType) ?? []
    return ordered.length > 0 ? ordered : Object.values(TrickType)
  })

  function trickTypeLabel (trickType: TrickType) {
    const valueId: string = trickType
    return tagsById.value.get(TRICK_TYPE_TAG)?.values.find(value => value.id === valueId)?.name ?? trickType
  }

  function appliesTo (tagId: string, discipline: Discipline) {
    const disciplines = tagsById.value.get(tagId)?.disciplines ?? []
    return disciplines.length === 0 || disciplines.includes(discipline)
  }

  return { tagsById, trickTypes, trickTypeLabel, appliesTo }
}
