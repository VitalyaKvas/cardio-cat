import { describe, it, expect } from 'vitest'
import { hexToRgba } from '../color'

describe('hexToRgba', () => {
  it('converts a 6-digit hex with alpha', () => {
    expect(hexToRgba('#ff5406', 0.5)).toBe('rgba(255, 84, 6, 0.5)')
  })

  it('accepts hex without leading hash', () => {
    expect(hexToRgba('00b33f', 1)).toBe('rgba(0, 179, 63, 1)')
  })

  it('handles black and white', () => {
    expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)')
    expect(hexToRgba('#ffffff', 0.25)).toBe('rgba(255, 255, 255, 0.25)')
  })
})
