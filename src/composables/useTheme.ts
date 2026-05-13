import { BOOT_CACHE_KEYS } from '@/constants/storage'
import { useSettingsStore } from '@/stores/settings'
import { computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (mode === 'dark') html.classList.add('dark')
  else html.classList.remove('dark')
}

export function useTheme() {
  const settings = useSettingsStore()

  const theme = computed({
    get: () => settings.state.theme,
    set: (val: ThemeMode) => {
      settings.state.theme = val
    },
  })

  function setTheme(value: ThemeMode) {
    theme.value = value
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  watch(
    theme,
    (val) => {
      applyTheme(val)
    },
    { immediate: true },
  )

  return { theme, setTheme, toggleTheme }
}

export function bootstrapTheme() {
  if (typeof window === 'undefined') return
  try {
    const saved = localStorage.getItem(BOOT_CACHE_KEYS.theme)
    const resolved: ThemeMode =
      saved === 'dark'
        ? 'dark'
        : saved === 'light'
          ? 'light'
          : window.matchMedia?.('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
    applyTheme(resolved)
  } catch {
    applyTheme('light')
  }
}
