import { createI18n, type Composer } from 'vue-i18n'
import crh from './locales/crh.json'
import en from './locales/en.json'
import uk from './locales/uk.json'

export type Locale = 'uk' | 'en' | 'crh'

export const SUPPORTED_LOCALES: Locale[] = ['uk', 'en', 'crh']

export const DEFAULT_LOCALE: Locale = 'uk'

type Messages = typeof uk

const messages: Record<Locale, Messages> = {
  uk,
  en,
  crh: crh as Messages,
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'uk',
  messages,
  missingWarn: false,
  fallbackWarn: false,
})

export const i18nGlobal = i18n.global as unknown as Composer<
  { uk: Messages; en: Messages; crh: Messages },
  Record<string, never>,
  Record<string, never>,
  Locale
>

export function setI18nLocale(locale: Locale) {
  i18nGlobal.locale.value = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale === 'crh' ? 'crh-Latn' : locale
  }
}
