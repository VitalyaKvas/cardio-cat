import { describe, it, expect } from 'vitest'
import { formatTimer, formatMmSs } from '../time'

describe('formatTimer', () => {
  it('formats whole seconds as HH:MM:SS', () => {
    expect(formatTimer(0)).toBe('00:00:00')
    expect(formatTimer(59)).toBe('00:00:59')
    expect(formatTimer(60)).toBe('00:01:00')
    expect(formatTimer(3600)).toBe('01:00:00')
    expect(formatTimer(3661)).toBe('01:01:01')
  })

  it('clamps negative input to zero', () => {
    expect(formatTimer(-10)).toBe('00:00:00')
  })

  it('floors fractional seconds', () => {
    expect(formatTimer(59.9)).toBe('00:00:59')
  })
})

describe('formatMmSs', () => {
  it('formats seconds as m:ss', () => {
    expect(formatMmSs(0)).toBe('0:00')
    expect(formatMmSs(45)).toBe('0:45')
    expect(formatMmSs(60)).toBe('1:00')
    expect(formatMmSs(125)).toBe('2:05')
  })

  it('clamps negative input', () => {
    expect(formatMmSs(-5)).toBe('0:00')
  })
})
