import { format, isValid, parseISO } from 'date-fns'
import { Discipline, GrantType, TagValueType, TimingCueType, VideoType } from './graphql/generated/graphql'

import type { AttributionInput, TrickLocalisationInput, TrickTagInput } from './graphql/generated/graphql'

/** The Tricktionary's own ruleset, whose levels group the trick list */
export const TRICKTIONARY = 'tricktionary'

export const disciplineNames: Record<Discipline, string> = {
  [Discipline.SingleRope]: 'Single Rope',
  [Discipline.DoubleDutch]: 'Double Dutch',
  [Discipline.Wheel]: 'Wheel'
}

export const videoTypeNames: Record<VideoType, string> = {
  [VideoType.FullSpeed]: 'Full speed',
  [VideoType.SlowMo]: 'Slow motion',
  [VideoType.Explainer]: 'Explainer'
}

/** The types that show the trick itself rather than explain it, in the order the public site's player prefers them */
export const trickVideoTypes = [VideoType.FullSpeed, VideoType.SlowMo]

export const grantTypeNames: Record<GrantType, string> = {
  [GrantType.SuperAdmin]: 'Super admin',
  [GrantType.TrickEditor]: 'Trick editor',
  [GrantType.Translator]: 'Translator',
  [GrantType.LevelEditor]: 'Level editor',
  [GrantType.SpeedEditor]: 'Speed editor',
  [GrantType.TagWrangler]: 'Tag wrangler'
}

export const TRICK_TYPE_TAG = 'trick-type'

export const tagValueTypeNames: Record<TagValueType, string> = {
  [TagValueType.Flag]: 'Flag',
  [TagValueType.Number]: 'Number',
  [TagValueType.Enum]: 'Enum'
}

interface TaggedTrick {
  tags: ReadonlyArray<{ tag: { id: string, valueType: TagValueType }, number?: number | null, values: ReadonlyArray<{ id: string }> }>
}

/** The ID of the trick type value */
export function trickTypeOf (trick: TaggedTrick): string | null {
  return trick.tags.find(trickTag => trickTag.tag.id === TRICK_TYPE_TAG)?.values[0]?.id ?? null
}

/** A tag on a trick, as a form holds it */
export interface TagRow {
  tagId: string
  valueType: TagValueType
  /** As the number input holds it, see `parseNumber` */
  number: string | number
  values: string[]
}

export function tagRows (trick: TaggedTrick): TagRow[] {
  return trick.tags.map(trickTag => ({
    tagId: trickTag.tag.id,
    valueType: trickTag.tag.valueType,
    number: trickTag.number ?? '',
    values: trickTag.values.map(value => value.id)
  }))
}

function tagRowIsSet (row: TagRow) {
  switch (row.valueType) {
    case TagValueType.Number: return parseNumber(row.number) != null
    case TagValueType.Enum: return row.values.length > 0
    default: return true
  }
}

/** What the rows hold, for comparing, a row without a value yet holds nothing */
export function tagRowsKey (rows: TagRow[]) {
  return JSON.stringify(rows
    .filter(tagRowIsSet)
    .map(row => [row.tagId, parseNumber(row.number), [...row.values].sort()])
    .sort(([a], [b]) => String(a).localeCompare(String(b))))
}

export function tagInput (row: TagRow): TrickTagInput {
  switch (row.valueType) {
    case TagValueType.Number: return { tagId: row.tagId, number: parseNumber(row.number) }
    case TagValueType.Enum: return { tagId: row.tagId, values: row.values }
    default: return { tagId: row.tagId }
  }
}

export const timingCueTypeNames: Record<TimingCueType, string> = {
  [TimingCueType.Start]: 'Start',
  [TimingCueType.Switch]: 'Switch',
  [TimingCueType.End]: 'End'
}

/** An event duration in seconds as m:ss, 0 means there is no time limit */
export function formatDuration (seconds: number) {
  if (seconds <= 0) return 'No time limit'
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** A timing track offset in milliseconds as m:ss.mmm */
export function formatOffset (milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const rest = Math.round(milliseconds % 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(rest).padStart(3, '0')}`
}

/**
 * A number field's value, null when it holds nothing a number can be read
 * from. `v-model` hands a number input's value over as a number once it parses.
 */
export function parseNumber (input: string | number) {
  const number = Number.parseFloat(String(input))
  return Number.isNaN(number) ? null : number
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** A timestamp as a date in the reader's own locale */
export function formatDate (timestamp: number) {
  return dateFormat.format(timestamp)
}

/** A millisecond timestamp as the local `YYYY-MM-DDTHH:mm` a `datetime-local` input takes */
export function toDatetimeLocal (milliseconds: number) {
  return format(milliseconds, "yyyy-MM-dd'T'HH:mm")
}

/** The millisecond timestamp a `datetime-local` value names in local time, null when it is empty or half typed */
export function fromDatetimeLocal (value: string) {
  const date = parseISO(value)
  return isValid(date) ? date.getTime() : null
}

const languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' })

/** The English name of a language tag, the tag itself when it names no language we can put a name to */
export function languageName (tag: string) {
  try {
    return languageDisplayNames.of(tag) ?? tag
  } catch {
    return tag
  }
}

/** A language tag as `Swedish (sv)`, for anywhere an admin picks or reads one */
export function languageLabel (tag: string) {
  return `${languageName(tag)} (${tag})`
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

/** The slug a trick name suggests, its words lowercased and joined by single dashes */
export function slugFromName (name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface NamedUser {
  id: string
  name?: string | null
  username?: string | null
  email?: string | null
}

/** What to call a user: the name their profile shows, else their username, email or id */
export function userLabel (user: NamedUser) {
  return user.name ?? user.username ?? user.email ?? user.id
}

export interface LocalisationValue {
  name: string
  alternativeNames: string[]
  description: string
}

/** The editable form of a localisation, blank throughout when there is none yet */
export function toLocalisationValue (localisation: { name: string, alternativeNames?: string[] | null, description?: string | null } | null | undefined): LocalisationValue {
  return {
    name: localisation?.name ?? '',
    alternativeNames: [...localisation?.alternativeNames ?? []],
    description: localisation?.description ?? ''
  }
}

/** A localisation as the API takes it, without the blank rows the editor left behind */
export function localisationInput (value: LocalisationValue): TrickLocalisationInput {
  return {
    name: value.name,
    alternativeNames: value.alternativeNames.map(alternative => alternative.trim()).filter(alternative => alternative !== ''),
    description: value.description
  }
}

/** A credit as the API takes it, null when the field holds nothing but whitespace */
export function attributionInput (name: string): AttributionInput | null {
  const trimmed = name.trim()
  return trimmed === '' ? null : { name: trimmed }
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

/**
 * A timing track cue as the admin edits it, offset in milliseconds from the
 * start of the audio, or from the go signal on a track that has none
 */
export interface CueRow {
  type: TimingCueType
  offset: number
  label: string
}
