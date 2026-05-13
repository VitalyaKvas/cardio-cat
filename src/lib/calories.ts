import { ageFromYob, zoneAt, type MaxHrFormula } from '@/lib/zones'

export type CalorieFormula = 'keytel' | 'simple' | 'met'
export type Sex = 'M' | 'F' | '?' | null | undefined

export type CalorieInput = {
  bpm: number
  durationSeconds: number
  yob?: number | null
  weight?: number | null
  sex?: Sex
  formula?: CalorieFormula
  maxHrFormula?: MaxHrFormula
}

const MET_BY_ZONE: Record<number, number> = { 1: 3.5, 2: 5.0, 3: 7.0, 4: 9.5, 5: 12.0 }

/**
 * BPM assumed during seconds where the heart-rate sensor is silent or
 * disconnected: light cardio (zone 1–2 boundary). The user is still training,
 * so we keep accumulating calories instead of zeroing them out.
 */
export const SILENT_BPM_ASSUMED = 110

/** Helper: estimated kcal for a single silent second. */
export function kcalForSilentSeconds(args: {
  seconds: number
  yob?: number | null
  weight?: number | null
  sex?: Sex
  formula?: CalorieFormula
  maxHrFormula?: import('@/lib/zones').MaxHrFormula
}): number {
  if (args.seconds <= 0) return 0
  return kcalForBpm({
    bpm: SILENT_BPM_ASSUMED,
    durationSeconds: args.seconds,
    yob: args.yob,
    weight: args.weight,
    sex: args.sex,
    formula: args.formula,
    maxHrFormula: args.maxHrFormula,
  })
}

/**
 * Float kcal/min for the given bpm + body. Internal helper that lets callers
 * accumulate small per-second deltas without rounding each tick to zero
 * (the cumulative chart needs sub-kcal precision).
 */
export function kcalRatePerMinute(input: Omit<CalorieInput, 'durationSeconds'>): number {
  const { bpm, yob, weight, sex, formula = 'keytel', maxHrFormula } = input
  if (bpm <= 0) return 0
  const age = ageFromYob(yob)

  if (formula === 'simple' || !weight || !sex || sex === '?') {
    return bpm * 0.014
  }

  if (formula === 'met') {
    const zone = zoneAt(bpm, yob, maxHrFormula)
    const met = MET_BY_ZONE[zone.z as number] ?? 5.0
    return (met * weight) / 60
  }

  const ratePerMin =
    sex === 'M'
      ? (-55.0969 + 0.6309 * bpm + 0.1988 * weight + 0.2017 * age) / 4.184
      : (-20.4022 + 0.4472 * bpm - 0.1263 * weight + 0.074 * age) / 4.184

  return Math.max(0, ratePerMin)
}

export function kcalForBpm(input: CalorieInput): number {
  const { durationSeconds } = input
  if (durationSeconds <= 0) return 0
  const rate = kcalRatePerMinute(input)
  return Math.round((rate * durationSeconds) / 60)
}

export function kcalForSeries(
  bpmSeries: number[],
  intervalSeconds: number,
  meta: Omit<CalorieInput, 'bpm' | 'durationSeconds'>,
): number {
  if (!bpmSeries.length) return 0
  let total = 0
  for (const bpm of bpmSeries) {
    total += kcalForBpm({ ...meta, bpm, durationSeconds: intervalSeconds })
  }
  return total
}
