import { computed } from 'vue'
import { GrantType, VerificationLevel } from '../graphql/generated/graphql'
import useAuth from './useAuth'

/**
 * The verification levels are ranked, a level editor may verify a trick level
 * at their own rank or lower. Rank 0 means they may edit levels but not verify
 * them. This mirrors `verificationLevelRank` in the API.
 */
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
  const { user, loading } = useAuth()

  const grants = computed(() => user.value?.grants ?? [])

  const isSuperAdmin = computed(() => grants.value.some(grant => grant.type === GrantType.SuperAdmin))
  const canEditTricks = computed(() => isSuperAdmin.value || grants.value.some(grant => grant.type === GrantType.TrickEditor))

  /**
   * English is the source language of the Tricktionary, so trick editors are
   * its translators rather than anyone with a translator grant.
   */
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

  /** The highest level the user may verify this ruleset's levels at */
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

  /**
   * Whether the user may change this ruleset's levels at all. A level editor
   * without a verification level still edits, they only cannot verify.
   */
  function canEditLevels (rulesId: string) {
    return isSuperAdmin.value || grants.value.some(grant => grant.type === GrantType.LevelEditor && grant.rulesId === rulesId)
  }

  /** Whether the user has any reason at all to be in here */
  const hasAnyAccess = computed(() => grants.value.length > 0)

  return {
    grants,
    isSuperAdmin,
    canEditTricks,
    translatorLangs,
    levelEditorRank,
    canEditLevels,
    hasAnyAccess,
    loading
  }
}
