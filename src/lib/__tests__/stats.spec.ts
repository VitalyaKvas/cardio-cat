import { describe, it, expect } from 'vitest'
import { SAMPLE_GAP, SAMPLE_INTERP, SAMPLE_LIVE, SAMPLE_STALE } from '../sampleStatus'
import { aggregateParticipantSeries } from '../stats'

const SETTINGS = { formula: 'simple' as const, maxHrFormula: 'classic' as const }

describe('aggregateParticipantSeries', () => {
  it('returns finite zeros for an empty series', () => {
    const stats = aggregateParticipantSeries({ series: [], participant: null, ...SETTINGS })
    expect(stats).toEqual({
      avg: 0,
      min: 0,
      max: 0,
      kcal: 0,
      durationSeconds: 0,
      sampleCount: 0,
      rawSum: 0,
    })
  })

  it('computes avg/min/max from raw samples', () => {
    const stats = aggregateParticipantSeries({
      series: [100, 120, 140, 160],
      participant: null,
      ...SETTINGS,
    })
    expect(stats.avg).toBe(130)
    expect(stats.min).toBe(100)
    expect(stats.max).toBe(160)
    expect(stats.sampleCount).toBe(4)
    expect(stats.rawSum).toBe(520)
  })

  it('defaults durationSeconds to series.length when omitted', () => {
    const stats = aggregateParticipantSeries({ series: [120, 130], participant: null, ...SETTINGS })
    expect(stats.durationSeconds).toBe(2)
  })

  it('respects an explicit durationSeconds override', () => {
    const stats = aggregateParticipantSeries({
      series: [120],
      participant: null,
      durationSeconds: 600,
      ...SETTINGS,
    })
    expect(stats.durationSeconds).toBe(600)
  })

  it('returns kcal=0 when no participant is supplied', () => {
    const stats = aggregateParticipantSeries({
      series: [120, 130, 140],
      participant: null,
      durationSeconds: 600,
      ...SETTINGS,
    })
    expect(stats.kcal).toBe(0)
  })

  it('returns positive kcal for a real participant', () => {
    const stats = aggregateParticipantSeries({
      series: [120, 140, 160],
      participant: { yob: 1990, weight: 70, sex: 'M' },
      durationSeconds: 600,
      formula: 'keytel',
      maxHrFormula: 'classic',
    })
    expect(stats.kcal).toBeGreaterThan(0)
  })

  it('skips stale and gap samples from avg/min/max but keeps duration', () => {
    // Series mixes real measurements with a 0-bpm disconnect and a held-over
    // stale value. avg/min/max must reflect only the live/interp samples,
    // while durationSeconds tracks the full timeline (so silent-kcal can be
    // added on top in callers that need it).
    const stats = aggregateParticipantSeries({
      series: [100, 120, 0, 120, 140],
      statuses: [SAMPLE_LIVE, SAMPLE_INTERP, SAMPLE_GAP, SAMPLE_STALE, SAMPLE_LIVE],
      participant: null,
      ...SETTINGS,
    })
    expect(stats.sampleCount).toBe(3)
    expect(stats.rawSum).toBe(360)
    expect(stats.avg).toBe(120)
    expect(stats.min).toBe(100)
    expect(stats.max).toBe(140)
    expect(stats.durationSeconds).toBe(5)
  })

  it('returns zero avg/min/max when every sample is non-measured', () => {
    const stats = aggregateParticipantSeries({
      series: [0, 0, 100],
      statuses: [SAMPLE_GAP, SAMPLE_GAP, SAMPLE_STALE],
      participant: null,
      ...SETTINGS,
    })
    expect(stats.sampleCount).toBe(0)
    expect(stats.avg).toBe(0)
    expect(stats.min).toBe(0)
    expect(stats.max).toBe(0)
  })

  it('still accrues kcal during silent seconds via the fallback formula', () => {
    // 5 measured seconds at avg ~120 + 5 silent seconds: total kcal must
    // exceed the kcal of the measured portion alone, since the silent block
    // is now credited at a light-cardio assumed rate.
    const measuredOnly = aggregateParticipantSeries({
      series: [100, 110, 120, 130, 140],
      statuses: [SAMPLE_LIVE, SAMPLE_LIVE, SAMPLE_LIVE, SAMPLE_LIVE, SAMPLE_LIVE],
      participant: { yob: 1990, weight: 70, sex: 'M' },
      formula: 'keytel',
      maxHrFormula: 'classic',
    })
    const withSilentTail = aggregateParticipantSeries({
      series: [100, 110, 120, 130, 140, 0, 0, 0, 0, 0],
      statuses: [
        SAMPLE_LIVE,
        SAMPLE_LIVE,
        SAMPLE_LIVE,
        SAMPLE_LIVE,
        SAMPLE_LIVE,
        SAMPLE_GAP,
        SAMPLE_GAP,
        SAMPLE_GAP,
        SAMPLE_GAP,
        SAMPLE_GAP,
      ],
      participant: { yob: 1990, weight: 70, sex: 'M' },
      formula: 'keytel',
      maxHrFormula: 'classic',
    })
    expect(withSilentTail.sampleCount).toBe(5)
    expect(withSilentTail.kcal).toBeGreaterThan(measuredOnly.kcal)
  })

  it('treats every sample as measured when statuses are omitted', () => {
    // Backward-compat path: legacy sessions without bpmStatus must keep their
    // historical avg/min/max behavior unchanged.
    const stats = aggregateParticipantSeries({
      series: [100, 200, 50],
      participant: null,
      ...SETTINGS,
    })
    expect(stats.sampleCount).toBe(3)
    expect(stats.avg).toBe(117)
    expect(stats.min).toBe(50)
    expect(stats.max).toBe(200)
  })
})
