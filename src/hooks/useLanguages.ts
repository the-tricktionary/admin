import { computed } from 'vue'
import { useLanguagesQuery } from '../graphql/generated/graphql'

export default function useLanguages (enabled?: () => boolean) {
  const { result, loading, error } = useLanguagesQuery(() => ({ enabled: enabled?.() ?? true }))

  const languages = computed(() => [...result.value?.languages ?? []].sort((a, b) => a.id.localeCompare(b.id)))

  // english is the source language of the Tricktionary, never a translation
  const translatableLangs = computed(() => languages.value.map(language => language.id).filter(id => id !== 'en'))

  return { languages, translatableLangs, loading, error }
}
