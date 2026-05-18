// Per-sample classification for the 1 Hz bpm series. The chart and stats
// derive their behavior from these values; persisted as a parallel number[]
// alongside Session.bpmSeries to keep legacy data importable.
//
// LIVE        — real reading from the sensor (bpm > 0).
// STALE       — virtual point on ticks 1–10 of a silence: copy of the last
//               live bpm, rendered gray. Bridges short BLE hiccups.
// STALE_DARK  — virtual point on ticks 11–20 of a silence: still the last
//               live bpm, rendered darker to signal "the sensor is probably
//               lost". After tick 20 the bridge gives up and we emit GAP.
// GAP         — real 0: emitted on disconnect or after the virtual budget
//               (20 ticks) is spent.
// INTERP is legacy (no longer written); kept so old sessions still classify.

export const SAMPLE_LIVE = 0
export const SAMPLE_INTERP = 1
export const SAMPLE_STALE = 2
export const SAMPLE_GAP = 3
export const SAMPLE_STALE_DARK = 4

export type SampleStatus =
  | typeof SAMPLE_LIVE
  | typeof SAMPLE_INTERP
  | typeof SAMPLE_STALE
  | typeof SAMPLE_STALE_DARK
  | typeof SAMPLE_GAP

/** A measured second contributes to avg/min/max. Stale/gap do not. */
export function isMeasured(s: number | undefined): boolean {
  return s === SAMPLE_LIVE || s === SAMPLE_INTERP
}
