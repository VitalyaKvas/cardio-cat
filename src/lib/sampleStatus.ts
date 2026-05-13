// Per-sample classification for the 1 Hz bpm series. The chart and stats
// derive their behavior from these values; persisted as a parallel number[]
// alongside Session.bpmSeries to keep legacy data importable.
//
// LIVE  — real reading from the sensor (bpm > 0).
// STALE — virtual point: copy of the last live bpm, used to bridge short
//         BLE silences (≤4 ticks) so the line doesn't dive to 0 on a hiccup.
// GAP   — real 0: emitted on disconnect or after the virtual budget is spent.
// INTERP is legacy (no longer written); kept so old sessions still classify.

export const SAMPLE_LIVE = 0
export const SAMPLE_INTERP = 1
export const SAMPLE_STALE = 2
export const SAMPLE_GAP = 3

export type SampleStatus =
  | typeof SAMPLE_LIVE
  | typeof SAMPLE_INTERP
  | typeof SAMPLE_STALE
  | typeof SAMPLE_GAP

/** A measured second contributes to avg/min/max. Stale/gap do not. */
export function isMeasured(s: number | undefined): boolean {
  return s === SAMPLE_LIVE || s === SAMPLE_INTERP
}
