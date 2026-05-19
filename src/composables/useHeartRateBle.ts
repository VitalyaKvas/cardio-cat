// Minimal Web Bluetooth helper for the standard Heart Rate Service (0x180D).
// Types come from @types/web-bluetooth (referenced via env.d.ts).

import { bleError, bleLog, bleTrace, bleWarn } from '@/lib/blelog'

// Web Bluetooth has no built-in timeout for gatt.connect(). If the device is
// paired but not currently advertising, the call can hang forever. Bound it
// so callers can fall back (e.g. open the chooser) instead of waiting silently.
const GATT_CONNECT_TIMEOUT_MS = 8000

export type HeartRateStop = { stop: () => void }

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

export async function requestHeartRateDevice(): Promise<BluetoothDevice> {
  if (!isWebBluetoothSupported()) throw new Error('Web Bluetooth is not supported in this browser')
  return navigator.bluetooth.requestDevice({
    // Only heart-rate sensors (e.g. chest straps).
    filters: [{ services: ['heart_rate'] }],
    optionalServices: ['heart_rate'],
  })
}

export async function getAllowedHeartRateDevices(): Promise<BluetoothDevice[]> {
  if (!isWebBluetoothSupported()) return []
  if (typeof navigator.bluetooth.getDevices !== 'function') return []
  return (await navigator.bluetooth.getDevices()) ?? []
}

export function isGetDevicesSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.bluetooth &&
    typeof navigator.bluetooth.getDevices === 'function'
  )
}

export type HeartRateConnection = HeartRateStop & {
  // Tear down listeners + notifications without calling gatt.disconnect().
  // Use when a fresh stopper for the SAME BluetoothDevice replaces this one:
  // disconnect() would kill the just-established session because both stoppers
  // share device.gatt.
  detach: () => void
  onDisconnect: (cb: () => void) => void
}

export async function connectAndListenHeartRate(
  device: BluetoothDevice,
  onValue: (bpm: number | null) => void,
): Promise<HeartRateConnection> {
  const deviceMeta = { deviceId: device.id, deviceName: device.name ?? null }
  bleLog('connect.start', deviceMeta)

  const gatt = device.gatt
  if (!gatt) {
    const err = new Error('Device has no GATT server')
    bleError('connect.gatt.missing', err, deviceMeta)
    throw err
  }

  // Reset any half-open GATT state held from a previous session. Without this,
  // gatt.connect() can silently hang because the radio still considers the
  // device "connected" from the browser's POV even though notifications stopped.
  if (gatt.connected) {
    bleWarn('connect.gatt.alreadyConnected.resetting', deviceMeta)
    try {
      gatt.disconnect()
    } catch (err) {
      bleError('connect.gatt.preDisconnect.failed', err, deviceMeta)
    }
  }

  let server: BluetoothRemoteGATTServer
  try {
    server = await Promise.race([
      gatt.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`gatt.connect timed out after ${GATT_CONNECT_TIMEOUT_MS}ms`)),
          GATT_CONNECT_TIMEOUT_MS,
        ),
      ),
    ])
  } catch (err) {
    bleError('connect.gatt.connect.failed', err, deviceMeta)
    // Make sure we don't leave a dangling in-flight connect hogging the radio
    // if the timeout fired before the browser resolved.
    try {
      gatt.disconnect()
    } catch {
      /* ignore — best-effort cleanup after timeout */
    }
    throw err
  }

  let service: BluetoothRemoteGATTService
  try {
    service = await server.getPrimaryService('heart_rate')
  } catch (err) {
    bleError('connect.getPrimaryService.failed', err, deviceMeta)
    throw err
  }

  let characteristic: BluetoothRemoteGATTCharacteristic
  try {
    characteristic = await service.getCharacteristic('heart_rate_measurement')
  } catch (err) {
    bleError('connect.getCharacteristic.failed', err, deviceMeta)
    throw err
  }

  let lastSampleAt = 0
  let sampleCount = 0
  const handler = (event: Event) => {
    try {
      const target = event.target as BluetoothRemoteGATTCharacteristic | null
      const value = target?.value
      if (!value) return
      const bpm = parseHeartRate(value)
      if (typeof bpm === 'number' && !Number.isNaN(bpm)) {
        sampleCount++
        lastSampleAt = Date.now()
        if (sampleCount % 30 === 1) {
          // Log every 30th sample (~once per 30 s) to avoid console flood.
          bleLog('sample.tick', { ...deviceMeta, bpm, sampleCount })
        }
        onValue(bpm)
      } else {
        bleWarn('sample.parse.invalid', {
          ...deviceMeta,
          raw: Array.from(new Uint8Array(value.buffer)),
        })
      }
    } catch (err) {
      bleError('sample.handler.threw', err, deviceMeta)
    }
  }

  try {
    await characteristic.startNotifications()
    bleLog('characteristic.notifications.started', deviceMeta)
  } catch (err) {
    bleError('characteristic.startNotifications.failed', err, deviceMeta)
    throw err
  }
  characteristic.addEventListener('characteristicvaluechanged', handler)

  let externalDisconnectCb: (() => void) | null = null

  const onDisconnected = () => {
    bleTrace('gattserverdisconnected', {
      ...deviceMeta,
      sampleCount,
      lastSampleAt,
      msSinceLastSample: lastSampleAt ? Date.now() - lastSampleAt : null,
    })
    try {
      onValue(null)
    } catch (err) {
      bleError('onDisconnected.onValue.threw', err, deviceMeta)
    }
    if (externalDisconnectCb) {
      try {
        externalDisconnectCb()
      } catch (err) {
        bleError('onDisconnected.externalCb.threw', err, deviceMeta)
      }
    }
  }

  try {
    device.addEventListener('gattserverdisconnected', onDisconnected)
  } catch (err) {
    bleError('addEventListener.gattserverdisconnected.failed', err, deviceMeta)
  }

  bleLog('connect.ready', deviceMeta)

  let detached = false
  const detach = () => {
    if (detached) return
    detached = true
    externalDisconnectCb = null
    try {
      characteristic.removeEventListener('characteristicvaluechanged', handler)
    } catch (err) {
      bleError('detach.removeEventListener.failed', err, deviceMeta)
    }
    try {
      void characteristic.stopNotifications()
    } catch (err) {
      bleError('detach.stopNotifications.failed', err, deviceMeta)
    }
    try {
      device.removeEventListener('gattserverdisconnected', onDisconnected)
    } catch (err) {
      bleError('detach.removeDisconnectListener.failed', err, deviceMeta)
    }
  }

  return {
    stop() {
      bleLog('connection.stop.called', { ...deviceMeta, sampleCount, lastSampleAt })
      detach()
      try {
        server.disconnect()
      } catch (err) {
        bleError('stop.server.disconnect.failed', err, deviceMeta)
      }
    },
    detach,
    onDisconnect(cb) {
      externalDisconnectCb = cb
    },
  }
}

export function parseHeartRate(view: DataView): number {
  // Heart Rate Measurement spec:
  // Flags byte 0: bit 0 = 1 → HR is Uint16 at bytes 1-2, else Uint8 at byte 1.
  const flags = view.getUint8(0)
  const hr16 = (flags & 0x01) !== 0
  if (hr16) return view.getUint16(1, /*littleEndian*/ true)
  return view.getUint8(1)
}
