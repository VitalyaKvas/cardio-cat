// Runtime BLE state lifted out of useParticipantBle into a Pinia store so
// HMR resets cleanly, tests can swap the active Pinia, and Vue Devtools sees
// the live device state.

import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export type StopHandle = { stop: () => void; onDisconnect?: (cb: () => void) => void }

export type BleMaps = {
  liveBpm: Record<string, Record<string, number | null>>
  bleStop: Record<string, Record<string, StopHandle | undefined>>
  connecting: Record<string, Record<string, boolean>>
  lastSeenMs: Record<string, Record<string, number | undefined>>
  failed: Record<string, Record<string, boolean>>
  retryAttempts: Record<string, Record<string, number>>
  // Set when removeBleDevice is called while a reconnect retry chain is in
  // flight — handleMidSessionDisconnect checks this before each step so the
  // user-initiated removal beats the still-sleeping backoff.
  aborted: Record<string, Record<string, boolean>>
}

export type BpmListener = (participantId: string, bpm: number) => void

export const useBleRuntimeStore = defineStore('bleRuntime', () => {
  const maps = reactive<BleMaps>({
    liveBpm: {},
    bleStop: {},
    connecting: {},
    lastSeenMs: {},
    failed: {},
    retryAttempts: {},
    aborted: {},
  })

  // Re-evaluates stale checks every second without per-device timers.
  const nowTick = ref(0)

  let listeners: BpmListener[] = []

  function tickNow() {
    nowTick.value = (nowTick.value + 1) % 1_000_000
  }

  function addBpmListener(fn: BpmListener): () => void {
    listeners.push(fn)
    return () => {
      listeners = listeners.filter((x) => x !== fn)
    }
  }

  function emitBpm(participantId: string, bpm: number) {
    for (const fn of listeners) fn(participantId, bpm)
  }

  return { maps, nowTick, tickNow, addBpmListener, emitBpm }
})
