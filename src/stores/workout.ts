import { useWorkoutStorage, type WorkoutSnapshot } from '@/composables/useWorkoutStorage'
import { i18nGlobal } from '@/i18n'
import { BRAND_ACCENT } from '@/lib/color'
import { buildSeed } from '@/lib/seed'
import { useUiStore } from '@/stores/ui'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Defensive caps for importJson: the JSON file is user-supplied and must not
// be able to OOM the tab. ~5 MB and ~28 hours of 1 Hz samples per participant
// is well past any realistic real-world export.
const IMPORT_MAX_BYTES = 5 * 1024 * 1024
const IMPORT_MAX_SAMPLES_PER_PARTICIPANT = 100_000

export type BleInfo = { id: string; name?: string | null }

export type Sex = 'M' | 'F' | '?' | null

export type AvatarGlyph = string

export type Participant = {
  id: string
  name: string
  avatar: AvatarGlyph
  color: string
  yob: number | null
  weight: number | null
  sex: Sex
  ble: BleInfo[]
  hiddenAt: number | null
  createdAt: number
}

export type Session = {
  id: string
  participantIds: string[]
  startedAt: number
  endedAt?: number
  bpmSeries: Record<string, number[]>
  /**
   * Parallel to bpmSeries: per-second status code (see lib/sampleStatus).
   * Optional for backward compat — legacy sessions without it are treated
   * as all-live by callers.
   */
  bpmStatus?: Record<string, number[]>
}

export type ExportPayload = {
  version: '1.0'
  exportedAt: string
  participants: Participant[]
  sessions: Record<string, Session>
  currentSessionId: string | null
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function nowMs() {
  return Date.now()
}

function isQuotaExceeded(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' ||
      err.code === 22 ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

function migrateLegacyParticipant(
  p: Partial<Participant> & Record<string, unknown>,
  fallbackIndex = 0,
): Participant {
  const ble = p.ble as unknown
  const normalisedBle: BleInfo[] = Array.isArray(ble)
    ? (ble as BleInfo[])
    : ble && typeof ble === 'object'
      ? [ble as BleInfo]
      : []
  return {
    id: (p.id as string) ?? uid(),
    name: (p.name as string) ?? i18nGlobal.t('participant.defaultName', { n: fallbackIndex + 1 }),
    avatar: typeof p.avatar === 'string' ? (p.avatar as string) : '🦊',
    color: (p.color as string) ?? BRAND_ACCENT,
    yob: (p.yob as number | null) ?? null,
    weight: (p.weight as number | null) ?? null,
    sex: (p.sex as Sex) ?? null,
    ble: normalisedBle,
    hiddenAt: (p.hiddenAt as number | null) ?? null,
    createdAt: (p.createdAt as number) ?? nowMs(),
  }
}

const SVG_AVATAR_TO_EMOJI: Record<string, string> = {
  frog: '🐸',
  monkey: '🐵',
  dog: '🐶',
  cat: '🐱',
  bear: '🐻',
  tiger: '🐯',
}

function coerceAvatar(value: unknown): string {
  if (typeof value !== 'string' || !value) return '🦊'
  if (value.length <= 3 && /\p{Extended_Pictographic}/u.test(value)) return value
  return SVG_AVATAR_TO_EMOJI[value] ?? '🦊'
}

export const useWorkoutStore = defineStore('workout', () => {
  const storage = useWorkoutStorage()

  const participants = ref<Participant[]>([])
  const sessions = ref<Record<string, Session>>({})
  const currentSessionId = ref<string | null>(null)

  const visibleParticipants = computed(() => participants.value.filter((p) => p.hiddenAt == null))
  const trashedParticipants = computed(() =>
    participants.value
      .filter((p) => p.hiddenAt != null)
      .sort((a, b) => (b.hiddenAt ?? 0) - (a.hiddenAt ?? 0)),
  )

  const currentSession = computed(() =>
    currentSessionId.value ? (sessions.value[currentSessionId.value] ?? null) : null,
  )

  const isActive = computed(() => currentSessionId.value !== null)

  const orderedSessions = computed(() =>
    Object.values(sessions.value)
      .filter((s) => s.endedAt != null)
      .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)),
  )

  let quotaToastShown = false

  function handlePersistError(err: unknown): void {
    console.error('Persisting workout state failed:', err)
    if (!quotaToastShown && isQuotaExceeded(err)) {
      quotaToastShown = true
      useUiStore().pushToast('error', i18nGlobal.t('toast.storageFull'))
    }
  }

  function persistSessionMetaAsync(session: Session): void {
    storage.saveSessionMeta(session).catch(handlePersistError)
  }

  function persistCurrentIdAsync(): void {
    storage.setCurrentSessionId(currentSessionId.value).catch(handlePersistError)
  }

  function persistSessionSamplesAsync(sessionId: string, participantIds: Iterable<string>): void {
    const session = sessions.value[sessionId]
    if (!session) return
    const samples: Record<string, { bpm: number[]; status: number[] }> = {}
    for (const pid of participantIds) {
      const bpm = session.bpmSeries[pid]
      if (!bpm) continue
      const status = (session.bpmStatus ?? {})[pid] ?? bpm.map(() => 0)
      samples[pid] = { bpm: bpm.slice(), status: status.slice() }
    }
    if (Object.keys(samples).length === 0) return
    storage.saveSessionSamples(sessionId, samples).catch(handlePersistError)
  }

  // Coalesce hot-path writes (BPM samples) into one IndexedDB write per
  // PERSIST_DEBOUNCE_MS so a refresh mid-workout still keeps recent samples
  // while we do not block the main thread on every BLE notification.
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  const PERSIST_DEBOUNCE_MS = 2000
  const dirtyParticipantIds = new Set<string>()
  let dirtySessionId: string | null = null

  function scheduleSamplesFlush(sessionId: string, participantId: string): void {
    dirtySessionId = sessionId
    dirtyParticipantIds.add(participantId)
    if (persistTimer != null) return
    persistTimer = setTimeout(() => {
      persistTimer = null
      flushSamples()
    }, PERSIST_DEBOUNCE_MS)
  }

  function flushSamples(): void {
    if (!dirtySessionId || dirtyParticipantIds.size === 0) return
    const sid = dirtySessionId
    const ids = Array.from(dirtyParticipantIds)
    dirtyParticipantIds.clear()
    dirtySessionId = null
    persistSessionSamplesAsync(sid, ids)
  }

  function addParticipant(
    input: Partial<Omit<Participant, 'id' | 'createdAt' | 'ble'>>,
  ): Participant {
    const p: Participant = {
      id: uid(),
      name:
        (input.name ?? '').trim() ||
        i18nGlobal.t('participant.defaultName', { n: participants.value.length + 1 }),
      avatar: input.avatar ?? '🦊',
      color: input.color ?? BRAND_ACCENT,
      yob: input.yob ?? null,
      weight: input.weight ?? null,
      sex: input.sex ?? null,
      ble: [],
      hiddenAt: null,
      createdAt: nowMs(),
    }
    participants.value.push(p)
    storage.saveParticipant(p).catch(handlePersistError)
    return p
  }

  function updateParticipant(id: string, patch: Partial<Omit<Participant, 'id' | 'createdAt'>>) {
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    Object.assign(p, patch)
    storage.saveParticipant(p).catch(handlePersistError)
  }

  function renameParticipant(id: string, name: string) {
    updateParticipant(id, { name })
  }

  function hideParticipant(id: string) {
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    p.hiddenAt = nowMs()
    storage.saveParticipant(p).catch(handlePersistError)
  }

  function restoreParticipant(id: string) {
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    p.hiddenAt = null
    storage.saveParticipant(p).catch(handlePersistError)
  }

  function deleteForever(id: string) {
    participants.value = participants.value.filter((p) => p.id !== id)
    const dirtySessions: Session[] = []
    Object.values(sessions.value).forEach((s) => {
      const had = s.participantIds.includes(id)
      s.participantIds = s.participantIds.filter((pid) => pid !== id)
      if (had) delete s.bpmSeries[id]
      if (had && s.bpmStatus) delete s.bpmStatus[id]
      if (had) dirtySessions.push(s)
    })
    storage.deleteParticipant(id).catch(handlePersistError)
    for (const s of dirtySessions) {
      persistSessionMetaAsync(s)
    }
  }

  function emptyTrash() {
    const trashIds = participants.value.filter((p) => p.hiddenAt != null).map((p) => p.id)
    trashIds.forEach((id) => deleteForever(id))
  }

  function addBle(id: string, info: BleInfo) {
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    if (!p.ble.some((d) => d.id === info.id)) p.ble.push(info)
    storage.saveParticipant(p).catch(handlePersistError)
  }

  function removeBle(id: string, deviceId?: string) {
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    if (!deviceId) p.ble = []
    else p.ble = p.ble.filter((d) => d.id !== deviceId)
    storage.saveParticipant(p).catch(handlePersistError)
  }

  function startSession(selectedIds: string[]) {
    const id = uid()
    const session: Session = {
      id,
      participantIds: selectedIds.slice(),
      startedAt: nowMs(),
      bpmSeries: Object.fromEntries(selectedIds.map((pid) => [pid, []])),
      bpmStatus: Object.fromEntries(selectedIds.map((pid) => [pid, []])),
    }
    sessions.value[id] = session
    currentSessionId.value = id
    persistSessionMetaAsync(session)
    persistCurrentIdAsync()
    return id
  }

  function addToActiveSession(participantId: string): boolean {
    const s = currentSession.value
    if (!s) return false
    if (s.participantIds.includes(participantId)) return false
    s.participantIds.push(participantId)
    if (!s.bpmSeries[participantId]) s.bpmSeries[participantId] = []
    if (!s.bpmStatus) s.bpmStatus = {}
    if (!s.bpmStatus[participantId]) s.bpmStatus[participantId] = []
    persistSessionMetaAsync(s)
    return true
  }

  function ensureStatusArray(s: Session, pid: string): number[] {
    if (!s.bpmStatus) s.bpmStatus = {}
    if (!s.bpmStatus[pid]) s.bpmStatus[pid] = []
    // Pad to match the existing bpmSeries length so an in-progress session
    // restored from storage keeps both arrays index-aligned.
    const series = s.bpmSeries[pid]
    if (series && s.bpmStatus[pid].length < series.length) {
      while (s.bpmStatus[pid].length < series.length) s.bpmStatus[pid].push(0)
    }
    return s.bpmStatus[pid]
  }

  function appendBpmSample(participantId: string, bpm: number, status = 0) {
    const s = currentSession.value
    if (!s) return
    if (!s.bpmSeries[participantId]) s.bpmSeries[participantId] = []
    s.bpmSeries[participantId].push(bpm)
    const st = ensureStatusArray(s, participantId)
    st.push(status)
    scheduleSamplesFlush(s.id, participantId)
  }

  function finishSession(save = true): string | null {
    if (!currentSessionId.value) return null
    const id = currentSessionId.value
    const s = sessions.value[id]
    if (!s) {
      currentSessionId.value = null
      persistCurrentIdAsync()
      return null
    }
    if (persistTimer != null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    if (!save) {
      delete sessions.value[id]
      currentSessionId.value = null
      storage.deleteSession(id).catch(handlePersistError)
      persistCurrentIdAsync()
      dirtyParticipantIds.clear()
      dirtySessionId = null
      return null
    }
    // Flush any pending samples synchronously into the write queue, then
    // persist session metadata with the new endedAt timestamp.
    if (dirtySessionId === id && dirtyParticipantIds.size > 0) {
      persistSessionSamplesAsync(id, Array.from(dirtyParticipantIds))
      dirtyParticipantIds.clear()
      dirtySessionId = null
    } else {
      // No debounced flush ever ran (or another session was dirty) — write
      // every participant's series so on-disk samples match memory.
      persistSessionSamplesAsync(id, s.participantIds)
    }
    s.endedAt = nowMs()
    persistSessionMetaAsync(s)
    currentSessionId.value = null
    persistCurrentIdAsync()
    return id
  }

  function exportJson(): ExportPayload {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      participants: participants.value,
      sessions: sessions.value,
      currentSessionId: currentSessionId.value,
    }
  }

  async function importJson(raw: string): Promise<{
    ok: boolean
    errorKey?: string
    errorMessage?: string
  }> {
    if (raw.length > IMPORT_MAX_BYTES) {
      return { ok: false, errorKey: 'modals.invalidFile' }
    }
    try {
      const data = JSON.parse(raw) as ExportPayload
      if (!data || data.version !== '1.0' || !Array.isArray(data.participants)) {
        return { ok: false, errorKey: 'modals.invalidFile' }
      }
      participants.value = data.participants.map((p, i) => ({
        ...migrateLegacyParticipant(p as Partial<Participant>, i),
        avatar: coerceAvatar(p.avatar),
      }))
      const sanitisedSessions: Record<string, Session> = {}
      for (const [id, raw] of Object.entries(data.sessions ?? {})) {
        if (!raw || typeof raw !== 'object') continue
        const s = raw as Session
        const bpmSeries: Record<string, number[]> = {}
        for (const [pid, arr] of Object.entries(s.bpmSeries ?? {})) {
          if (!Array.isArray(arr)) continue
          bpmSeries[pid] = arr
            .slice(0, IMPORT_MAX_SAMPLES_PER_PARTICIPANT)
            .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        }
        const bpmStatus: Record<string, number[]> = {}
        const rawStatus = (s.bpmStatus ?? {}) as Record<string, unknown>
        for (const [pid, len] of Object.entries(bpmSeries).map(
          ([p, a]) => [p, a.length] as const,
        )) {
          const arr = rawStatus[pid]
          if (Array.isArray(arr)) {
            bpmStatus[pid] = arr
              .slice(0, len)
              .map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0))
            while (bpmStatus[pid].length < len) bpmStatus[pid].push(0)
          } else {
            bpmStatus[pid] = new Array(len).fill(0)
          }
        }
        sanitisedSessions[id] = { ...s, bpmSeries, bpmStatus }
      }
      sessions.value = sanitisedSessions
      currentSessionId.value = data.currentSessionId ?? null
      try {
        await storage.importWorkout({
          participants: participants.value,
          sessions: sessions.value,
          currentSessionId: currentSessionId.value,
        })
      } catch (err) {
        handlePersistError(err)
        return {
          ok: false,
          errorKey: 'modals.importError',
          errorMessage: err instanceof Error ? err.message : '',
        }
      }
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        errorKey: 'modals.importError',
        errorMessage: err instanceof Error ? err.message : '',
      }
    }
  }

  function clearAll() {
    participants.value = []
    sessions.value = {}
    currentSessionId.value = null
    if (persistTimer != null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    dirtyParticipantIds.clear()
    dirtySessionId = null
    storage.clearAll().catch(handlePersistError)
  }

  function applySnapshot(snap: WorkoutSnapshot): void {
    participants.value = snap.participants.map((p, i) => ({
      ...migrateLegacyParticipant(p as Partial<Participant>, i),
      avatar: coerceAvatar((p as Partial<Participant>).avatar),
    }))
    sessions.value = snap.sessions
    currentSessionId.value = snap.currentSessionId
  }

  async function restore(): Promise<void> {
    const snapshot = await storage.loadWorkout()
    const hasData = snapshot.participants.length > 0 || Object.keys(snapshot.sessions).length > 0
    if (hasData) {
      applySnapshot(snapshot)
      return
    }
    if (import.meta.env.DEV) {
      const seed = buildSeed()
      const fresh: WorkoutSnapshot = {
        participants: seed.participants,
        sessions: seed.sessions,
        currentSessionId: null,
      }
      applySnapshot(fresh)
      await storage.importWorkout(fresh).catch(handlePersistError)
    }
  }

  return {
    participants,
    visibleParticipants,
    trashedParticipants,
    sessions,
    orderedSessions,
    currentSessionId,
    currentSession,
    isActive,
    addParticipant,
    updateParticipant,
    renameParticipant,
    hideParticipant,
    restoreParticipant,
    deleteForever,
    emptyTrash,
    addBle,
    removeBle,
    startSession,
    addToActiveSession,
    appendBpmSample,
    finishSession,
    exportJson,
    importJson,
    clearAll,
    restore,
  }
})
