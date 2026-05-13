export const IDB_NAME = 'cardio-cat'
export const IDB_VERSION = 1

export const IDB_STORES = {
  participants: 'participants',
  sessions: 'sessions',
  sessionSamples: 'sessionSamples',
  meta: 'meta',
} as const

export const META_KEYS = {
  currentSessionId: 'currentSessionId',
  settings: 'settings',
  welcomeSeen: 'welcomeSeen',
  schemaVersion: 'schemaVersion',
} as const

// localStorage keys used as a write-through boot cache so bootstrap (theme,
// locale, first-run redirect) can read synchronously before IndexedDB hydrates.
export const BOOT_CACHE_KEYS = {
  theme: 'cc-boot-theme',
  locale: 'cc-boot-locale',
  welcomeSeen: 'cc-boot-welcome-seen',
} as const

// Pre-migration localStorage keys. Read only once during one-time migration to
// IndexedDB; never write here in new code.
export const LEGACY_LS_KEYS = {
  workout: 'cc-workout',
  oldWorkout: 'ps-workout',
  settings: 'cc-settings',
  theme: 'cc-theme',
  locale: 'cc-locale',
  welcomeSeen: 'cc-welcome-seen',
} as const

export type IdbStoreName = (typeof IDB_STORES)[keyof typeof IDB_STORES]
