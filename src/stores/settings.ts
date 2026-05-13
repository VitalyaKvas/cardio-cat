import { useWorkoutStorage } from '@/composables/useWorkoutStorage'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/i18n'
import type { CalorieFormula } from '@/lib/calories'
import { BRAND_ACCENT } from '@/lib/color'
import type { MaxHrFormula } from '@/lib/zones'
import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export type SettingsState = {
  theme: ThemeMode
  locale: Locale
  accentColor: string
  sounds: {
    start: boolean
    finish: boolean
    stale: boolean
    zone5: boolean
  }
  maxHrFormula: MaxHrFormula
  calorieFormula: CalorieFormula
  chartWindowSeconds: number
  staleMs: number
  workoutZoom: number
}

const DEFAULTS: SettingsState = {
  theme: 'light',
  locale: DEFAULT_LOCALE,
  accentColor: BRAND_ACCENT,
  sounds: {
    start: true,
    finish: true,
    stale: false,
    zone5: false,
  },
  maxHrFormula: 'classic',
  calorieFormula: 'keytel',
  chartWindowSeconds: 60,
  staleMs: 10000,
  workoutZoom: 1,
}

function normaliseLocale(raw: unknown): Locale {
  return SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE
}

function resolveSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function normaliseTheme(raw: unknown): ThemeMode {
  if (raw === 'dark') return 'dark'
  if (raw === 'light') return 'light'
  // Legacy 'system' or anything else → resolve to current OS preference once.
  return resolveSystemTheme()
}

function mergeSettings(parsed: Partial<SettingsState> | null): SettingsState {
  if (!parsed) {
    return { ...DEFAULTS, sounds: { ...DEFAULTS.sounds } }
  }
  return {
    ...DEFAULTS,
    ...parsed,
    theme: normaliseTheme(parsed.theme),
    locale: normaliseLocale(parsed.locale),
    sounds: { ...DEFAULTS.sounds, ...(parsed.sounds ?? {}) },
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const storage = useWorkoutStorage()
  const state = reactive<SettingsState>(mergeSettings(null))
  let hydrated = false

  watch(
    () => state,
    (val) => {
      if (!hydrated) return
      storage.saveSettings({ ...val, sounds: { ...val.sounds } }).catch((err) => {
        console.error('Persisting settings failed:', err)
      })
    },
    { deep: true },
  )

  async function restore(): Promise<void> {
    const persisted = await storage.loadSettings()
    Object.assign(state, mergeSettings(persisted))
    hydrated = true
  }

  function reset() {
    Object.assign(state, { ...DEFAULTS, sounds: { ...DEFAULTS.sounds } })
  }

  return { state, reset, restore }
})
