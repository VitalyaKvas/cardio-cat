import { describe, expect, it } from 'vitest'
import {
  isMeasured,
  SAMPLE_GAP,
  SAMPLE_INTERP,
  SAMPLE_LIVE,
  SAMPLE_STALE,
  SAMPLE_STALE_DARK,
} from '../sampleStatus'

describe('isMeasured', () => {
  it('treats live and interp as measured', () => {
    expect(isMeasured(SAMPLE_LIVE)).toBe(true)
    expect(isMeasured(SAMPLE_INTERP)).toBe(true)
  })

  it('rejects stale, gap, and unknown values', () => {
    expect(isMeasured(SAMPLE_STALE)).toBe(false)
    expect(isMeasured(SAMPLE_STALE_DARK)).toBe(false)
    expect(isMeasured(SAMPLE_GAP)).toBe(false)
    expect(isMeasured(undefined)).toBe(false)
    expect(isMeasured(99)).toBe(false)
  })
})
