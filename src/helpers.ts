import { Discipline } from './graphql/generated/graphql'

export const disciplineNames: Record<Discipline, string> = {
  [Discipline.SingleRope]: 'Single Rope',
  [Discipline.DoubleDutch]: 'Double Dutch',
  [Discipline.Wheel]: 'Wheel'
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

interface SortableTrick {
  slug: string
  en?: { name: string } | null
}

export function trickSorter (a: SortableTrick, b: SortableTrick) {
  return (a.en?.name ?? a.slug).localeCompare(b.en?.name ?? b.slug)
}
