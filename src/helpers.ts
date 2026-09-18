import { Discipline, VideoType } from './graphql/generated/graphql'

export const disciplineNames: Record<Discipline, string> = {
  [Discipline.SingleRope]: 'Single Rope',
  [Discipline.DoubleDutch]: 'Double Dutch',
  [Discipline.Wheel]: 'Wheel'
}

export const videoTypeNames: Record<VideoType, string> = {
  [VideoType.SlowMo]: 'Slow motion',
  [VideoType.Explainer]: 'Explainer'
}

export function disciplineToSlug (discipline: Discipline) {
  switch (discipline) {
    case Discipline.SingleRope:
      return 'sr'
    case Discipline.DoubleDutch:
      return 'dd'
    case Discipline.Wheel:
      return 'wh'
  }
}

export function slugToDiscipline (slug: string) {
  switch (slug) {
    case 'sr':
      return Discipline.SingleRope
    case 'dd':
      return Discipline.DoubleDutch
    case 'wh':
      return Discipline.Wheel
    default:
      return undefined
  }
}

/** The discipline a `?discipline=` parameter names, single rope when it names none */
export function queryDiscipline (slug: unknown) {
  return (typeof slug === 'string' ? slugToDiscipline(slug) : undefined) ?? Discipline.SingleRope
}

/** The editable part of a trick localisation, shared by the editor and its fields */
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

/**
 * The video ID an editor pasted, whether they pasted the bare ID or any of the
 * links YouTube hands out (watch, youtu.be, shorts, embed). Null when the input
 * is neither.
 */
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
