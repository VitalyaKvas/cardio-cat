import {
  connectAndListenHeartRate,
  getAllowedHeartRateDevices,
  isGetDevicesSupported,
  isWebBluetoothSupported,
  requestHeartRateDevice,
  type HeartRateConnection,
} from '@/composables/useHeartRateBle'
import { i18nGlobal } from '@/i18n'
import { bleError, bleLog, bleWarn } from '@/lib/blelog'
import { useBleRuntimeStore } from '@/stores/bleRuntime'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { onUnmounted } from 'vue'

const tr = i18nGlobal.t

const MAX_AUTO_RETRY = 3
const RECONNECT_BACKOFF_MS = 1500

// Timer + refCount stay in the module: they manage the staleness re-evaluation
// tick whose lifecycle is tied to component mounts, not Pinia store lifetime.
let staleTimer: ReturnType<typeof setInterval> | null = null
let refCount = 0

function ensure<T>(target: Record<string, Record<string, T>>, pid: string): Record<string, T> {
  if (!target[pid]) target[pid] = {}
  return target[pid]
}

function isUserCancelled(err: unknown): boolean {
  // Web Bluetooth throws DOMException("NotFoundError") when the user dismisses
  // the chooser without picking a device. That's a benign UX path, not a failure.
  return err instanceof DOMException && err.name === 'NotFoundError'
}

function isPermissionDenied(err: unknown): boolean {
  // Chrome surfaces site-level permission revokes as NotAllowedError or
  // SecurityError. Treat both as "the user has to fix browser settings".
  return (
    err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
  )
}

export function useParticipantBle() {
  const store = useWorkoutStore()
  const settings = useSettingsStore()
  const ui = useUiStore()
  const runtime = useBleRuntimeStore()
  const maps = runtime.maps

  refCount++
  if (refCount === 1 && typeof window !== 'undefined') {
    staleTimer = setInterval(() => runtime.tickNow(), 1000)
  }

  onUnmounted(() => {
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0 && staleTimer != null) {
      clearInterval(staleTimer)
      staleTimer = null
    }
  })

  function markBpm(pid: string, did: string, bpm: number | null) {
    ensure(maps.liveBpm, pid)[did] = bpm
    if (typeof bpm === 'number') {
      ensure(maps.lastSeenMs, pid)[did] = Date.now()
      ensure(maps.retryAttempts, pid)[did] = 0
      ensure(maps.failed, pid)[did] = false
      runtime.emitBpm(pid, bpm)
    }
  }

  function isStale(pid: string, did: string): boolean {
    void runtime.nowTick
    const t = maps.lastSeenMs[pid]?.[did]
    if (!t) return true
    return Date.now() - t > settings.state.staleMs
  }

  function getLiveBpm(pid: string, did: string): number | null {
    return maps.liveBpm[pid]?.[did] ?? null
  }

  function getCurrentBpmForParticipant(pid: string): number | null {
    const m = maps.liveBpm[pid]
    if (!m) return null
    for (const did of Object.keys(m)) {
      if (!isStale(pid, did)) return m[did]
    }
    return null
  }

  function isLost(pid: string, did: string): boolean {
    return !!maps.failed[pid]?.[did]
  }

  function retryCount(pid: string, did: string): number {
    return maps.retryAttempts[pid]?.[did] ?? 0
  }

  function bindStopper(pid: string, did: string, stopper: HeartRateConnection) {
    // Stop the previous stopper for the same (pid, did) before overwriting.
    // Otherwise its gattserverdisconnected listener stays attached to the
    // device and any future disconnect fires N parallel reconnect chains.
    const prev = maps.bleStop[pid]?.[did]
    if (prev && prev !== stopper) {
      try {
        prev.stop()
      } catch (err) {
        bleError('participant.bindStopper.prevStop.failed', err, {
          participantId: pid,
          deviceId: did,
        })
      }
    }
    ensure(maps.bleStop, pid)[did] = stopper
    ensure(maps.failed, pid)[did] = false
    ensure(maps.retryAttempts, pid)[did] = 0
    ensure(maps.aborted, pid)[did] = false
    bleLog('participant.bindStopper', { participantId: pid, deviceId: did })
    stopper.onDisconnect(() => {
      bleWarn('participant.disconnect.received', { participantId: pid, deviceId: did })
      void handleMidSessionDisconnect(pid, did)
    })
  }

  function isAborted(pid: string, did: string): boolean {
    return maps.aborted[pid]?.[did] === true
  }

  async function handleMidSessionDisconnect(pid: string, did: string) {
    if (isAborted(pid, did)) {
      bleLog('autoreconnect.aborted.entry', { participantId: pid, deviceId: did })
      return
    }
    if (maps.reconnecting[pid]?.[did]) {
      // A retry chain is already running. Stale listeners from a previous
      // session can fire duplicate disconnect events — ignore them so the
      // backoff and exhaustion toast stay single-shot.
      bleLog('autoreconnect.skip.alreadyInFlight', { participantId: pid, deviceId: did })
      return
    }
    if (!isGetDevicesSupported()) {
      ensure(maps.failed, pid)[did] = true
      bleWarn('autoreconnect.skip.noGetDevices', { participantId: pid, deviceId: did })
      ui.pushToast('warn', tr('ble.connectionLost'))
      return
    }

    ensure(maps.reconnecting, pid)[did] = true
    try {
      for (let attempt = 1; attempt <= MAX_AUTO_RETRY; attempt++) {
        if (isAborted(pid, did)) return
        ensure(maps.retryAttempts, pid)[did] = attempt
        bleLog('autoreconnect.attempt.start', { participantId: pid, deviceId: did, attempt })

        await new Promise((r) => setTimeout(r, RECONNECT_BACKOFF_MS * attempt))
        if (isAborted(pid, did)) {
          bleLog('autoreconnect.aborted.afterBackoff', {
            participantId: pid,
            deviceId: did,
            attempt,
          })
          return
        }

        try {
          const allowed = await getAllowedHeartRateDevices().catch((err) => {
            bleError('autoreconnect.getAllowedHeartRateDevices.failed', err, {
              participantId: pid,
              deviceId: did,
            })
            return [] as BluetoothDevice[]
          })
          if (isAborted(pid, did)) return
          const device = allowed.find((x) => x.id === did)
          if (!device) {
            ensure(maps.failed, pid)[did] = true
            bleWarn('autoreconnect.device.not.in.allowed.list', {
              participantId: pid,
              deviceId: did,
              allowedCount: allowed.length,
            })
            ui.pushToast('warn', tr('ble.deviceUnavailable'))
            return
          }
          const stopper = await connectAndListenHeartRate(device, (bpm) => markBpm(pid, did, bpm))
          if (isAborted(pid, did)) {
            bleLog('autoreconnect.aborted.afterConnect', {
              participantId: pid,
              deviceId: did,
              attempt,
            })
            stopper.stop()
            return
          }
          bindStopper(pid, did, stopper)
          bleLog('autoreconnect.success', { participantId: pid, deviceId: did, attempt })
          return
        } catch (err) {
          bleError('autoreconnect.attempt.failed', err, {
            participantId: pid,
            deviceId: did,
            attempt,
          })
          // fall through to the next attempt with a longer backoff
        }
      }

      ensure(maps.failed, pid)[did] = true
      bleWarn('autoreconnect.exhausted', {
        participantId: pid,
        deviceId: did,
        attempt: MAX_AUTO_RETRY,
      })
      ui.pushToast('warn', tr('ble.exhausted', { id: did.slice(0, 6), max: MAX_AUTO_RETRY }))
    } finally {
      if (maps.reconnecting[pid]) maps.reconnecting[pid][did] = false
    }
  }

  async function addBleDevice(participantId: string) {
    bleLog('addBleDevice.start', { participantId })
    try {
      if (!isWebBluetoothSupported()) {
        bleWarn('addBleDevice.webBluetooth.unsupported', { participantId })
        ui.pushToast('error', tr('ble.notSupported'))
        return
      }
      const device = await requestHeartRateDevice()
      bleLog('addBleDevice.picked', {
        participantId,
        deviceId: device.id,
        deviceName: device.name ?? null,
      })
      store.addBle(participantId, { id: device.id, name: device.name ?? null })
      const stopper = await connectAndListenHeartRate(device, (bpm) => {
        markBpm(participantId, device.id, bpm)
      })
      bindStopper(participantId, device.id, stopper)
      ui.pushToast(
        'success',
        tr('ble.connectedToast', { name: device.name ?? tr('participant.deviceFallback') }),
      )
    } catch (err) {
      if (isUserCancelled(err)) {
        bleLog('addBleDevice.cancelled', { participantId })
        return
      }
      if (isPermissionDenied(err)) {
        bleWarn('addBleDevice.permissionDenied', { participantId })
        ui.pushToast('error', tr('ble.permissionDenied'))
        return
      }
      bleError('addBleDevice.failed', err, { participantId })
      ui.pushToast('error', tr('ble.connectFailed'))
    }
  }

  function removeBleDevice(participantId: string, deviceId: string) {
    bleLog('removeBleDevice', { participantId, deviceId })
    ensure(maps.aborted, participantId)[deviceId] = true
    try {
      maps.bleStop[participantId]?.[deviceId]?.stop()
    } catch (err) {
      bleError('removeBleDevice.stop.failed', err, { participantId, deviceId })
    }
    if (maps.bleStop[participantId]) delete maps.bleStop[participantId][deviceId]
    if (maps.liveBpm[participantId]) delete maps.liveBpm[participantId][deviceId]
    if (maps.lastSeenMs[participantId]) delete maps.lastSeenMs[participantId][deviceId]
    if (maps.failed[participantId]) delete maps.failed[participantId][deviceId]
    if (maps.retryAttempts[participantId]) delete maps.retryAttempts[participantId][deviceId]
    if (maps.reconnecting[participantId]) delete maps.reconnecting[participantId][deviceId]
    store.removeBle(participantId, deviceId)
  }

  async function reconnectDevice(participantId: string, deviceId: string) {
    bleLog('reconnectDevice.start', { participantId, deviceId })
    try {
      if (!isWebBluetoothSupported()) {
        bleWarn('reconnectDevice.webBluetooth.unsupported', { participantId, deviceId })
        return
      }
      ensure(maps.retryAttempts, participantId)[deviceId] = 0
      ensure(maps.failed, participantId)[deviceId] = false
      if (isGetDevicesSupported()) {
        const allowed = await getAllowedHeartRateDevices().catch((err) => {
          bleError('reconnectDevice.getAllowed.failed', err, { participantId, deviceId })
          return []
        })
        const device = allowed.find((x) => x.id === deviceId)
        if (device) {
          bleLog('reconnectDevice.match.allowed', { participantId, deviceId })
          const stopper = await connectAndListenHeartRate(device, (bpm) => {
            markBpm(participantId, device.id, bpm)
          })
          bindStopper(participantId, device.id, stopper)
          ui.pushToast(
            'success',
            tr('ble.connectedToast', { name: device.name ?? tr('participant.deviceFallback') }),
          )
          return
        }
        bleWarn('reconnectDevice.no.allowed.match', {
          participantId,
          deviceId,
          allowedCount: allowed.length,
        })
      }
      const picked = await requestHeartRateDevice()
      bleLog('reconnectDevice.chooser.picked', {
        participantId,
        oldDeviceId: deviceId,
        pickedId: picked.id,
        pickedName: picked.name ?? null,
        replaced: picked.id !== deviceId,
      })
      if (picked.id !== deviceId) {
        removeBleDevice(participantId, deviceId)
      }
      store.addBle(participantId, { id: picked.id, name: picked.name ?? null })
      const stopper = await connectAndListenHeartRate(picked, (bpm) => {
        markBpm(participantId, picked.id, bpm)
      })
      bindStopper(participantId, picked.id, stopper)
      ui.pushToast(
        'success',
        tr('ble.connectedToast', { name: picked.name ?? tr('participant.deviceFallback') }),
      )
    } catch (err) {
      if (isUserCancelled(err)) {
        bleLog('reconnectDevice.cancelled', { participantId, deviceId })
        return
      }
      if (isPermissionDenied(err)) {
        bleWarn('reconnectDevice.permissionDenied', { participantId, deviceId })
        ui.pushToast('error', tr('ble.permissionDenied'))
        return
      }
      bleError('reconnectDevice.failed', err, { participantId, deviceId })
      ui.pushToast('error', tr('ble.reconnectFailed'))
    }
  }

  async function autoReconnectAll() {
    if (!isWebBluetoothSupported() || !isGetDevicesSupported()) return
    const allowed = await getAllowedHeartRateDevices().catch(() => [])
    if (!allowed.length) return
    const reconnectOne = async (pid: string, did: string, attempt = 1): Promise<void> => {
      const device = allowed.find((x) => x.id === did)
      if (!device) return
      ensure(maps.connecting, pid)[did] = true
      try {
        markBpm(pid, did, null)
        const stopper = await connectAndListenHeartRate(device, (bpm) => {
          markBpm(pid, did, bpm)
        })
        bindStopper(pid, did, stopper)
      } catch {
        if (attempt < MAX_AUTO_RETRY) {
          setTimeout(() => void reconnectOne(pid, did, attempt + 1), 400 * attempt)
        } else {
          ensure(maps.failed, pid)[did] = true
        }
      } finally {
        ensure(maps.connecting, pid)[did] = false
      }
    }
    for (const p of store.visibleParticipants) {
      for (const d of p.ble ?? []) {
        await reconnectOne(p.id, d.id)
      }
    }
  }

  function isConnecting(pid: string, did: string): boolean {
    return !!maps.connecting[pid]?.[did]
  }

  return {
    isStale,
    isConnecting,
    isLost,
    retryCount,
    getLiveBpm,
    getCurrentBpmForParticipant,
    addBleDevice,
    removeBleDevice,
    reconnectDevice,
    autoReconnectAll,
    addBpmListener: runtime.addBpmListener,
  }
}
