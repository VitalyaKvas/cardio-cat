import { BOOT_CACHE_KEYS } from '@/constants/storage'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, setI18nLocale, type Locale, i18nGlobal } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import { computed, watch } from 'vue'

export function useLocale() {
  const settings = useSettingsStore()

  const locale = computed({
    get: () => settings.state.locale,
    set: (val: Locale) => {
      settings.state.locale = val
    },
  })

  const supported = SUPPORTED_LOCALES

  function setLocale(value: Locale) {
    locale.value = value
  }

  watch(
    locale,
    (val) => {
      setI18nLocale(val)
    },
    { immediate: true },
  )

  return { locale, supported, setLocale }
}

export function bootstrapLocale() {
  if (typeof window === 'undefined') return
  try {
    const saved = localStorage.getItem(BOOT_CACHE_KEYS.locale)
    const resolved: Locale =
      saved && SUPPORTED_LOCALES.includes(saved as Locale) ? (saved as Locale) : DEFAULT_LOCALE
    i18nGlobal.locale.value = resolved
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolved === 'crh' ? 'crh-Latn' : resolved
    }
  } catch {
    i18nGlobal.locale.value = DEFAULT_LOCALE
  }
}
