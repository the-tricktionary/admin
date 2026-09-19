import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import useGrants from './useGrants'
import useLanguages from './useLanguages'

/** One choice for the whole app, so every view that shows or edits a translation agrees on it */
const stored = useLocalStorage('translation-lang', '')

export default function useTranslationLang () {
  const { isSuperAdmin, translatorLangs } = useGrants()
  const { translatableLangs } = useLanguages(() => isSuperAdmin.value)

  /** A super admin may translate into any language, everyone else into the ones they are granted */
  const editableLangs = computed(() => {
    const available = isSuperAdmin.value ? translatableLangs.value : translatorLangs.value.filter(other => other !== 'en')
    return [...available].sort((a, b) => a.localeCompare(b))
  })

  /**
   * The language to edit, which is the shared choice whenever this admin may
   * translate into it. Falling back to one they may leaves the choice alone, so
   * a language they can only inspect survives a visit to an editor.
   */
  const editLang = computed({
    get: () => editableLangs.value.includes(stored.value) ? stored.value : editableLangs.value[0] ?? '',
    set: (lang: string) => { stored.value = lang }
  })

  return { lang: stored, editableLangs, editLang }
}
