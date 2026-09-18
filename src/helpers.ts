import { Discipline, GrantType, VideoType } from './graphql/generated/graphql'

export const disciplineNames: Record<Discipline, string> = {
  [Discipline.SingleRope]: 'Single Rope',
  [Discipline.DoubleDutch]: 'Double Dutch',
  [Discipline.Wheel]: 'Wheel'
}

export const videoTypeNames: Record<VideoType, string> = {
  [VideoType.SlowMo]: 'Slow motion',
  [VideoType.Explainer]: 'Explainer'
}

export const grantTypeNames: Record<GrantType, string> = {
  [GrantType.SuperAdmin]: 'Super admin',
  [GrantType.TrickEditor]: 'Trick editor',
  [GrantType.Translator]: 'Translator',
  [GrantType.LevelEditor]: 'Level editor'
}

const disciplineSlugs: Record<Discipline, string> = {
  [Discipline.SingleRope]: 'sr',
  [Discipline.DoubleDutch]: 'dd',
  [Discipline.Wheel]: 'wh'
}

export function disciplineToSlug (discipline: Discipline) {
  return disciplineSlugs[discipline]
}

/** The discipline a `?discipline=` parameter names, single rope when it names none */
export function queryDiscipline (slug: unknown) {
  return Object.values(Discipline).find(discipline => disciplineSlugs[discipline] === slug) ?? Discipline.SingleRope
}

export interface LocalisationValue {
  name: string
  alternativeNames: string[]
  description: string
}

interface SortableTrick {
  slug: string
  en?: { name: string } | null
}

export function trickSorter (a: SortableTrick, b: SortableTrick) {
  return (a.en?.name ?? a.slug).localeCompare(b.en?.name ?? b.slug)
}

const YOUTUBE_ID = /^[\w-]{11}$/

/** The video ID in a bare ID or any of the links YouTube hands out (watch, youtu.be, shorts, embed) */
export function parseYouTubeId (input: string): string | null {
  const trimmed = input.trim()
  if (YOUTUBE_ID.test(trimmed)) return trimmed

  let url: URL
  try {
    url = new URL(trimmed.includes('//') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^(www|m)\./, '')
  const path: Array<string | undefined> = url.pathname.split('/').filter(part => part !== '')

  let id: string | null | undefined
  if (host === 'youtu.be') {
    id = path[0]
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (path[0] === 'watch') id = url.searchParams.get('v')
    else if (path[0] === 'shorts' || path[0] === 'embed') id = path[1]
  }

  return id != null && YOUTUBE_ID.test(id) ? id : null
}
