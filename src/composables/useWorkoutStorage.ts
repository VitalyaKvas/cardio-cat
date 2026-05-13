import {
  BOOT_CACHE_KEYS,
  IDB_NAME,
  IDB_STORES,
  IDB_VERSION,
  LEGACY_LS_KEYS,
  META_KEYS,
} from '@/constants/storage'
import type { SettingsState } from '@/stores/settings'
import type { Participant, Session } from '@/stores/workout'
import { openDB, type IDBPDatabase } from 'idb'

export type SessionMeta = Omit<Session, 'bpmSeries' | 'bpmStatus'>

export type SessionSamples = {
  bpm: number[]
  status: number[]
}

export type WorkoutSnapshot = {
  participants: Participant[]
  sessions: Record<string, Session>
  currentSessionId: string | null
}

let dbPromise: Promise<IDBPDatabase> | null = null

function openDatabase(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(IDB_NAME, IDB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IDB_STORES.participants)) {
          db.createObjectStore(IDB_STORES.participants, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.sessions)) {
          db.createObjectStore(IDB_STORES.sessions, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.sessionSamples)) {
          // Out-of-line key [sessionId, participantId] so we can write one
          // participant's series without touching the rest.
          db.createObjectStore(IDB_STORES.sessionSamples)
        }
        if (!db.objectStoreNames.contains(IDB_STORES.meta)) {
          db.createObjectStore(IDB_STORES.meta)
        }
      },
    })
  }
  return dbPromise
}

function stripSamples(session: Session): SessionMeta {
  return {
    id: session.id,
    participantIds: session.participantIds,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  }
}

// IndexedDB uses the structured clone algorithm, which can choke on Vue's
// reactive Proxies in some browsers. JSON round-trip is cheap for our payload
// shapes (plain data, no Date/Blob/Map) and gives a guaranteed-safe snapshot.
function cloneForIdb<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function emptyArrays(len: number): number[] {
  return Array.from({ length: len }, () => 0)
}

function readLegacyLocalStorage(): {
  workout: WorkoutSnapshot | null
  settings: Partial<SettingsState> | null
  theme: string | null
  locale: string | null
  welcomeSeen: boolean | null
} {
  const result = {
    workout: null as WorkoutSnapshot | null,
    settings: null as Partial<SettingsState> | null,
    theme: null as string | null,
    locale: null as string | null,
    welcomeSeen: null as boolean | null,
  }
  try {
    let workoutRaw = localStorage.getItem(LEGACY_LS_KEYS.workout)
    if (!workoutRaw) workoutRaw = localStorage.getItem(LEGACY_LS_KEYS.oldWorkout)
    if (workoutRaw) {
      const parsed = JSON.parse(workoutRaw) as Partial<WorkoutSnapshot>
      result.workout = {
        participants: parsed.participants ?? [],
        sessions: parsed.sessions ?? {},
        currentSessionId: parsed.currentSessionId ?? null,
      }
    }
  } catch {}
  try {
    const settingsRaw = localStorage.getItem(LEGACY_LS_KEYS.settings)
    if (settingsRaw) result.settings = JSON.parse(settingsRaw) as Partial<SettingsState>
  } catch {}
  try {
    result.theme = localStorage.getItem(LEGACY_LS_KEYS.theme)
    result.locale = localStorage.getItem(LEGACY_LS_KEYS.locale)
    const ws = localStorage.getItem(LEGACY_LS_KEYS.welcomeSeen)
    if (ws !== null) result.welcomeSeen = ws === '1'
  } catch {}
  return result
}

function removeLegacyLocalStorageKeys(): void {
  try {
    localStorage.removeItem(LEGACY_LS_KEYS.workout)
    localStorage.removeItem(LEGACY_LS_KEYS.oldWorkout)
    localStorage.removeItem(LEGACY_LS_KEYS.settings)
    localStorage.removeItem(LEGACY_LS_KEYS.theme)
    localStorage.removeItem(LEGACY_LS_KEYS.locale)
    localStorage.removeItem(LEGACY_LS_KEYS.welcomeSeen)
  } catch {}
}

function writeBootCache(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

async function migrateFromLocalStorage(db: IDBPDatabase): Promise<void> {
  const existing = await db.get(IDB_STORES.meta, META_KEYS.schemaVersion)
  if (existing != null) return

  const legacy = readLegacyLocalStorage()
  const tx = db.transaction(
    [IDB_STORES.participants, IDB_STORES.sessions, IDB_STORES.sessionSamples, IDB_STORES.meta],
    'readwrite',
  )

  if (legacy.workout) {
    const participantsStore = tx.objectStore(IDB_STORES.participants)
    for (const p of legacy.workout.participants) {
      await participantsStore.put(p)
    }
    const sessionsStore = tx.objectStore(IDB_STORES.sessions)
    const samplesStore = tx.objectStore(IDB_STORES.sessionSamples)
    for (const session of Object.values(legacy.workout.sessions)) {
      await sessionsStore.put(stripSamples(session))
      const bpmSeries = session.bpmSeries ?? {}
      const bpmStatus = session.bpmStatus ?? {}
      for (const [pid, bpm] of Object.entries(bpmSeries)) {
        const status = bpmStatus[pid] ?? emptyArrays(bpm.length)
        await samplesStore.put({ bpm, status }, [session.id, pid])
      }
    }
    await tx
      .objectStore(IDB_STORES.meta)
      .put(legacy.workout.currentSessionId, META_KEYS.currentSessionId)
  }

  if (legacy.settings) {
    await tx.objectStore(IDB_STORES.meta).put(legacy.settings, META_KEYS.settings)
  }
  if (legacy.welcomeSeen != null) {
    await tx.objectStore(IDB_STORES.meta).put(legacy.welcomeSeen, META_KEYS.welcomeSeen)
    if (legacy.welcomeSeen) writeBootCache(BOOT_CACHE_KEYS.welcomeSeen, '1')
  }
  if (legacy.theme) writeBootCache(BOOT_CACHE_KEYS.theme, legacy.theme)
  if (legacy.locale) writeBootCache(BOOT_CACHE_KEYS.locale, legacy.locale)

  await tx.objectStore(IDB_STORES.meta).put(1, META_KEYS.schemaVersion)
  await tx.done

  removeLegacyLocalStorageKeys()
}

export interface WorkoutStorage {
  init(): Promise<void>
  loadWorkout(): Promise<WorkoutSnapshot>
  saveParticipant(participant: Participant): Promise<void>
  saveParticipants(participants: Participant[]): Promise<void>
  deleteParticipant(id: string): Promise<void>
  saveSessionMeta(session: Session): Promise<void>
  saveSessionSamples(sessionId: string, samples: Record<string, SessionSamples>): Promise<void>
  deleteSession(sessionId: string): Promise<void>
  setCurrentSessionId(id: string | null): Promise<void>
  loadSettings(): Promise<Partial<SettingsState> | null>
  saveSettings(state: SettingsState): Promise<void>
  loadWelcomeSeen(): Promise<boolean>
  saveWelcomeSeen(seen: boolean): Promise<void>
  clearAll(): Promise<void>
  importWorkout(snapshot: WorkoutSnapshot): Promise<void>
}

let storage: WorkoutStorage | null = null

export function useWorkoutStorage(): WorkoutStorage {
  if (storage) return storage

  storage = {
    async init() {
      const db = await openDatabase()
      await migrateFromLocalStorage(db)
    },

    async loadWorkout() {
      const db = await openDatabase()
      const tx = db.transaction(
        [IDB_STORES.participants, IDB_STORES.sessions, IDB_STORES.sessionSamples, IDB_STORES.meta],
        'readonly',
      )
      const participants = (await tx.objectStore(IDB_STORES.participants).getAll()) as Participant[]
      const sessionMetas = (await tx.objectStore(IDB_STORES.sessions).getAll()) as SessionMeta[]
      const samplesStore = tx.objectStore(IDB_STORES.sessionSamples)
      const sampleKeys = (await samplesStore.getAllKeys()) as Array<[string, string]>
      const sampleValues = (await samplesStore.getAll()) as SessionSamples[]
      const currentSessionId =
        ((await tx.objectStore(IDB_STORES.meta).get(META_KEYS.currentSessionId)) as
          | string
          | null) ?? null
      await tx.done

      const sessions: Record<string, Session> = {}
      for (const meta of sessionMetas) {
        sessions[meta.id] = { ...meta, bpmSeries: {}, bpmStatus: {} }
      }
      for (let i = 0; i < sampleKeys.length; i++) {
        const [sessionId, participantId] = sampleKeys[i]
        const value = sampleValues[i]
        const session = sessions[sessionId]
        if (!session) continue
        session.bpmSeries[participantId] = value.bpm
        if (!session.bpmStatus) session.bpmStatus = {}
        session.bpmStatus[participantId] = value.status
      }

      return { participants, sessions, currentSessionId }
    },

    async saveParticipant(participant) {
      const db = await openDatabase()
      await db.put(IDB_STORES.participants, cloneForIdb(participant))
    },

    async saveParticipants(participants) {
      const db = await openDatabase()
      const tx = db.transaction(IDB_STORES.participants, 'readwrite')
      const store = tx.objectStore(IDB_STORES.participants)
      const existing = (await store.getAllKeys()) as string[]
      const incomingIds = new Set(participants.map((p) => p.id))
      for (const id of existing) {
        if (!incomingIds.has(id)) await store.delete(id)
      }
      for (const p of participants) {
        await store.put(cloneForIdb(p))
      }
      await tx.done
    },

    async deleteParticipant(id) {
      const db = await openDatabase()
      await db.delete(IDB_STORES.participants, id)
    },

    async saveSessionMeta(session) {
      const db = await openDatabase()
      await db.put(IDB_STORES.sessions, cloneForIdb(stripSamples(session)))
    },

    async saveSessionSamples(sessionId, samples) {
      const db = await openDatabase()
      const tx = db.transaction(IDB_STORES.sessionSamples, 'readwrite')
      const store = tx.objectStore(IDB_STORES.sessionSamples)
      for (const [pid, value] of Object.entries(samples)) {
        await store.put(cloneForIdb(value), [sessionId, pid])
      }
      await tx.done
    },

    async deleteSession(sessionId) {
      const db = await openDatabase()
      const tx = db.transaction([IDB_STORES.sessions, IDB_STORES.sessionSamples], 'readwrite')
      await tx.objectStore(IDB_STORES.sessions).delete(sessionId)
      const samplesStore = tx.objectStore(IDB_STORES.sessionSamples)
      const keys = (await samplesStore.getAllKeys()) as Array<[string, string]>
      for (const k of keys) {
        if (k[0] === sessionId) await samplesStore.delete(k)
      }
      await tx.done
    },

    async setCurrentSessionId(id) {
      const db = await openDatabase()
      await db.put(IDB_STORES.meta, id, META_KEYS.currentSessionId)
    },

    async loadSettings() {
      const db = await openDatabase()
      const value = await db.get(IDB_STORES.meta, META_KEYS.settings)
      return (value as Partial<SettingsState> | undefined) ?? null
    },

    async saveSettings(state) {
      const db = await openDatabase()
      await db.put(IDB_STORES.meta, cloneForIdb(state), META_KEYS.settings)
      writeBootCache(BOOT_CACHE_KEYS.theme, state.theme)
      writeBootCache(BOOT_CACHE_KEYS.locale, state.locale)
    },

    async loadWelcomeSeen() {
      const db = await openDatabase()
      const v = await db.get(IDB_STORES.meta, META_KEYS.welcomeSeen)
      return v === true
    },

    async saveWelcomeSeen(seen) {
      const db = await openDatabase()
      await db.put(IDB_STORES.meta, seen, META_KEYS.welcomeSeen)
      writeBootCache(BOOT_CACHE_KEYS.welcomeSeen, seen ? '1' : '0')
    },

    async clearAll() {
      const db = await openDatabase()
      const tx = db.transaction(
        [IDB_STORES.participants, IDB_STORES.sessions, IDB_STORES.sessionSamples, IDB_STORES.meta],
        'readwrite',
      )
      await tx.objectStore(IDB_STORES.participants).clear()
      await tx.objectStore(IDB_STORES.sessions).clear()
      await tx.objectStore(IDB_STORES.sessionSamples).clear()
      const metaStore = tx.objectStore(IDB_STORES.meta)
      // Preserve schemaVersion and settings; reset workout-related meta.
      await metaStore.delete(META_KEYS.currentSessionId)
      await tx.done
    },

    async importWorkout(snapshot) {
      const safe = cloneForIdb(snapshot)
      const db = await openDatabase()
      const tx = db.transaction(
        [IDB_STORES.participants, IDB_STORES.sessions, IDB_STORES.sessionSamples, IDB_STORES.meta],
        'readwrite',
      )
      await tx.objectStore(IDB_STORES.participants).clear()
      await tx.objectStore(IDB_STORES.sessions).clear()
      await tx.objectStore(IDB_STORES.sessionSamples).clear()
      const participantsStore = tx.objectStore(IDB_STORES.participants)
      for (const p of safe.participants) {
        await participantsStore.put(p)
      }
      const sessionsStore = tx.objectStore(IDB_STORES.sessions)
      const samplesStore = tx.objectStore(IDB_STORES.sessionSamples)
      for (const session of Object.values(safe.sessions)) {
        await sessionsStore.put(stripSamples(session))
        const bpmSeries = session.bpmSeries ?? {}
        const bpmStatus = session.bpmStatus ?? {}
        for (const [pid, bpm] of Object.entries(bpmSeries)) {
          const status = bpmStatus[pid] ?? emptyArrays(bpm.length)
          await samplesStore.put({ bpm, status }, [session.id, pid])
        }
      }
      await tx.objectStore(IDB_STORES.meta).put(safe.currentSessionId, META_KEYS.currentSessionId)
      await tx.done
    },
  }

  return storage
}
