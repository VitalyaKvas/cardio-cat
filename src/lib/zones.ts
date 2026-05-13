export type MaxHrFormula = 'classic' | 'tanaka' | 'gulati'

export type Zone = {
  z: 1 | 2 | 3 | 4 | 5
  name: string
  from: number
  to: number
  color: string
  cssVar: string
}

const CURRENT_YEAR = new Date().getFullYear()

export function ageFromYob(yob: number | null | undefined, now = CURRENT_YEAR): number {
  if (!yob || yob < 1900 || yob > now) return 30
  return now - yob
}

export function maxHr(yob: number | null | undefined, formula: MaxHrFormula = 'classic'): number {
  const age = ageFromYob(yob)
  switch (formula) {
    case 'tanaka':
      return Math.round(208 - 0.7 * age)
    case 'gulati':
      return Math.round(206 - 0.88 * age)
    case 'classic':
    default:
      return 220 - age
  }
}

const ZONE_NAMES: ReadonlyArray<Zone['name']> = ['warmup', 'fatBurn', 'aerobic', 'anaerobic', 'max']

const ZONE_BOUNDS: ReadonlyArray<[number, number]> = [
  [0.5, 0.6],
  [0.6, 0.7],
  [0.7, 0.8],
  [0.8, 0.9],
  [0.9, 1.0],
]

const ZONE_VARS: ReadonlyArray<string> = [
  '--zone-1',
  '--zone-2',
  '--zone-3',
  '--zone-4',
  '--zone-5',
]
const ZONE_HEX: ReadonlyArray<string> = ['#00a9dd', '#00b33f', '#ffb800', '#ff6d00', '#ff3400']

export type ZoneTable = {
  age: number
  maxHr: number
  ranges: Zone[]
}

export function zonesFor(
  yob: number | null | undefined,
  formula: MaxHrFormula = 'classic',
): ZoneTable {
  const age = ageFromYob(yob)
  const max = maxHr(yob, formula)
  const ranges: Zone[] = ZONE_BOUNDS.map(([lo, hi], i) => ({
    z: (i + 1) as Zone['z'],
    name: ZONE_NAMES[i],
    from: Math.round(max * lo),
    to: Math.round(max * hi),
    color: ZONE_HEX[i],
    cssVar: `var(${ZONE_VARS[i]})`,
  }))
  return { age, maxHr: max, ranges }
}

export type RestZone = {
  z: 0
  name: 'rest'
  color: string
  cssVar: string
}

export type AnyZone = Zone | RestZone

export const REST_ZONE: RestZone = {
  z: 0,
  name: 'rest',
  color: '#a0a0a0',
  cssVar: 'var(--c-text-4)',
}

export function zoneAt(
  bpm: number,
  yob: number | null | undefined,
  formula: MaxHrFormula = 'classic',
): AnyZone {
  const table = zonesFor(yob, formula)
  if (bpm < table.ranges[0].from) return REST_ZONE
  for (const r of table.ranges) {
    if (bpm >= r.from && bpm <= r.to) return r
  }
  return table.ranges[table.ranges.length - 1]
}

export function pctOfMax(
  bpm: number,
  yob: number | null | undefined,
  formula: MaxHrFormula = 'classic',
): number {
  const m = maxHr(yob, formula)
  if (m <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((bpm / m) * 100)))
}
