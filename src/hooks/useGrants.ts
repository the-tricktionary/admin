import { computed } from 'vue'
import { GrantType, VerificationLevel } from '../graphql/generated/graphql'
import useAuth from './useAuth'

/** Mirrors the API: a level editor may verify at their own rank or lower, rank 0 may only edit */
export function verificationLevelRank (level: VerificationLevel | null | undefined): 0 | 1 | 2 {
  switch (level) {
    case VerificationLevel.Official:
      return 2
    case VerificationLevel.Judge:
      return 1
    default:
      return 0
  }
}

export default function useGrants () {
  const { user } = useAuth()

  const grants = computed(() => user.value?.grants ?? [])

  const isSuperAdmin = computed(() => grants.value.some(grant => grant.type === GrantType.SuperAdmin))
  const canEditTricks = computed(() => isSuperAdmin.value || grants.value.some(grant => grant.type === GrantType.TrickEditor))

  // english is the source language of the Tricktionary, so trick editors are
  // its translators rather than anyone with a translator grant
  const translatorLangs = computed(() => {
    const langs = new Set(
      grants.value
        .filter(grant => grant.type === GrantType.Translator)
        .map(grant => grant.lang)
        .filter(lang => lang != null)
    )
    if (canEditTricks.value) langs.add('en')
    return [...langs]
  })

  function levelEditorRank (rulesId: string): 0 | 1 | 2 {
    if (isSuperAdmin.value) return 2
    let rank: 0 | 1 | 2 = 0
    for (const grant of grants.value) {
      if (grant.type !== GrantType.LevelEditor || grant.rulesId !== rulesId) continue
      const grantRank = verificationLevelRank(grant.verificationLevel)
      if (grantRank > rank) rank = grantRank
    }
    return rank
  }

  function canEditLevels (rulesId: string) {
    return isSuperAdmin.value || grants.value.some(grant => grant.type === GrantType.LevelEditor && grant.rulesId === rulesId)
  }

  const hasAnyAccess = computed(() => grants.value.length > 0)

  return { isSuperAdmin, canEditTricks, translatorLangs, levelEditorRank, canEditLevels, hasAnyAccess }
}
