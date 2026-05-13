// Color helpers shared by chart tooltips and markArea fills.

// Brand accent default — the only "tangerine" the app ships with. The user can
// override via Settings -> Accent, but every default-color spawn point (new
// participant, seeded avatar, palette swatch) reads this constant.
export const BRAND_ACCENT = '#ff5406'

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
