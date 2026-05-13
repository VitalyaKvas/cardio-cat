import { describe, it, expect } from 'vitest'
import { ageFromYob, maxHr, pctOfMax, zoneAt, zonesFor, REST_ZONE } from '../zones'

const NOW_YEAR = 2026

describe('ageFromYob', () => {
  it('returns explicit age when yob is valid', () => {
    expect(ageFromYob(1990, NOW_YEAR)).toBe(36)
  })

  it('falls back to 30 for missing or absurd values', () => {
    expect(ageFromYob(null, NOW_YEAR)).toBe(30)
    expect(ageFromYob(undefined, NOW_YEAR)).toBe(30)
    expect(ageFromYob(0, NOW_YEAR)).toBe(30)
    expect(ageFromYob(1800, NOW_YEAR)).toBe(30)
    expect(ageFromYob(NOW_YEAR + 5, NOW_YEAR)).toBe(30)
  })
})

describe('maxHr', () => {
  it('uses the classic formula by default', () => {
    expect(maxHr(1990, 'classic')).toBe(220 - ageFromYob(1990))
  })

  it('matches the Tanaka formula', () => {
    const age = ageFromYob(1990)
    expect(maxHr(1990, 'tanaka')).toBe(Math.round(208 - 0.7 * age))
  })

  it('matches the Gulati formula', () => {
    const age = ageFromYob(1990)
    expect(maxHr(1990, 'gulati')).toBe(Math.round(206 - 0.88 * age))
  })
})

describe('zonesFor', () => {
  it('returns five zones with strictly increasing bounds', () => {
    const t = zonesFor(1990, 'classic')
    expect(t.ranges).toHaveLength(5)
    for (let i = 1; i < t.ranges.length; i++) {
      expect(t.ranges[i].from).toBeGreaterThanOrEqual(t.ranges[i - 1].from)
      expect(t.ranges[i].to).toBeGreaterThanOrEqual(t.ranges[i - 1].to)
    }
  })
})

describe('zoneAt', () => {
  it('returns REST_ZONE below the first zone', () => {
    const result = zoneAt(40, 1990, 'classic')
    expect(result).toBe(REST_ZONE)
  })

  it('returns Z5 for very high BPM', () => {
    const result = zoneAt(220, 1990, 'classic')
    expect('z' in result && result.z).toBe(5)
  })
})

describe('pctOfMax', () => {
  it('clamps to [0, 100]', () => {
    expect(pctOfMax(0, 1990)).toBe(0)
    expect(pctOfMax(1000, 1990)).toBe(100)
  })

  it('returns approximately 50% at half of max HR', () => {
    const m = maxHr(1990, 'classic')
    expect(pctOfMax(Math.round(m / 2), 1990)).toBe(50)
  })
})
