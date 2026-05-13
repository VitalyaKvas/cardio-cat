import { describe, it, expect } from 'vitest'
import { kcalForBpm, kcalForSeries } from '../calories'

describe('kcalForBpm', () => {
  it('returns 0 for non-positive duration or bpm', () => {
    expect(kcalForBpm({ bpm: 0, durationSeconds: 60 })).toBe(0)
    expect(kcalForBpm({ bpm: 140, durationSeconds: 0 })).toBe(0)
    expect(kcalForBpm({ bpm: -1, durationSeconds: 60 })).toBe(0)
  })

  it('uses the simple formula when sex or weight is missing', () => {
    const minutes = 10
    const bpm = 150
    const expected = Math.round(bpm * 0.014 * minutes)
    expect(kcalForBpm({ bpm, durationSeconds: minutes * 60 })).toBe(expected)
    expect(kcalForBpm({ bpm, durationSeconds: minutes * 60, weight: 70, sex: '?' })).toBe(expected)
  })

  it('uses the Keytel formula when weight + sex are supplied (male)', () => {
    const result = kcalForBpm({
      bpm: 150,
      durationSeconds: 600,
      weight: 80,
      sex: 'M',
      yob: 1990,
      formula: 'keytel',
    })
    expect(result).toBeGreaterThan(0)
  })

  it('produces non-negative kcal for the female Keytel branch', () => {
    const result = kcalForBpm({
      bpm: 150,
      durationSeconds: 600,
      weight: 60,
      sex: 'F',
      yob: 1990,
      formula: 'keytel',
    })
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('uses MET when formula is met', () => {
    const result = kcalForBpm({
      bpm: 150,
      durationSeconds: 600,
      weight: 70,
      sex: 'M',
      yob: 1990,
      formula: 'met',
    })
    expect(result).toBeGreaterThan(0)
  })
})

describe('kcalForSeries', () => {
  it('returns 0 for empty series', () => {
    expect(kcalForSeries([], 1, { weight: 70, sex: 'M', yob: 1990 })).toBe(0)
  })

  it('sums per-sample contributions over a meaningful interval', () => {
    // Each sample represents a full minute → contributions are large enough
    // to survive the per-sample Math.round inside kcalForBpm.
    const result = kcalForSeries([120, 140, 160], 60, { weight: 70, sex: 'M', yob: 1990 })
    expect(result).toBeGreaterThan(0)
  })
})
