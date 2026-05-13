import type { CalorieFormula } from '@/lib/calories'
import { kcalForBpm, kcalForSilentSeconds } from '@/lib/calories'
import { isMeasured } from '@/lib/sampleStatus'
import type { MaxHrFormula } from '@/lib/zones'

export type ParticipantLike = {
  yob?: number | null
  weight?: number | null
  sex?: 'M' | 'F' | '?' | null
}

export type ParticipantStats = {
  avg: number
  min: number
  max: number
  kcal: number
  durationSeconds: number
  sampleCount: number
  rawSum: number
}

export type AggregateInput = {
  series: number[]
  /**
   * Optional parallel status array. When supplied, only entries marked as
   * measured (live or interp) contribute to avg/min/max/kcal — stale and gap
   * (disconnect) seconds are excluded so statistics reflect only the period
   * when the heart rate sensor was actually delivering data.
   */
  statuses?: number[]
  participant: ParticipantLike | null | undefined
  /** Defaults to the count of measured samples (1 Hz sampling assumption). */
  durationSeconds?: number
  formula: CalorieFormula
  maxHrFormula: MaxHrFormula
}

/**
 * Single source of truth for the bpmSeries → {avg, min, max, kcal} reduction
 * used in WorkoutView, SummaryView, ParticipantSummaryCard, and
 * ParticipantDetailView. Always returns finite zeros for empty series so
 * callers don't need to handle Infinity sentinels.
 */
export function aggregateParticipantSeries(args: AggregateInput): ParticipantStats {
  const { series, statuses, participant, formula, maxHrFormula } = args
  const useFilter = Array.isArray(statuses)
  const durationSeconds = args.durationSeconds ?? series.length
  if (!series.length) {
    return { avg: 0, min: 0, max: 0, kcal: 0, durationSeconds, sampleCount: 0, rawSum: 0 }
  }
  let sum = 0
  let min: number | null = null
  let max: number | null = null
  let sampleCount = 0
  for (let i = 0; i < series.length; i++) {
    if (useFilter && !isMeasured(statuses?.[i])) continue
    const v = series[i]
    sum += v
    if (min === null || v < min) min = v
    if (max === null || v > max) max = v
    sampleCount++
  }
  const avg = sampleCount > 0 ? Math.round(sum / sampleCount) : 0
  // Calories accumulate even when the sensor is silent or disconnected:
  // measured seconds use the real avg bpm, the rest fall back to a
  // light-cardio assumption so the user sees credit for the work they did.
  let kcal = 0
  if (participant) {
    if (sampleCount > 0) {
      kcal += kcalForBpm({
        bpm: avg,
        durationSeconds: sampleCount,
        yob: participant.yob,
        weight: participant.weight,
        sex: participant.sex,
        formula,
        maxHrFormula,
      })
    }
    const silentSec = Math.max(0, durationSeconds - sampleCount)
    if (silentSec > 0) {
      kcal += kcalForSilentSeconds({
        seconds: silentSec,
        yob: participant.yob,
        weight: participant.weight,
        sex: participant.sex,
        formula,
        maxHrFormula,
      })
    }
  }
  return {
    avg,
    min: min ?? 0,
    max: max ?? 0,
    kcal,
    durationSeconds,
    sampleCount,
    rawSum: sum,
  }
}
