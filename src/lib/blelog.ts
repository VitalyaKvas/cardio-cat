// Centralised BLE diagnostic logger.
// Every line is prefixed with the unique tag [CC-BLE] so it can be
// grepped in the source and filtered in DevTools. A rolling in-memory
// buffer keeps the last N events so the user can dump them on demand.

export type BleLogEvent = {
  t: number
  iso: string
  level: 'info' | 'warn' | 'error'
  tag: string
  data: Record<string, unknown>
}

const TAG = '[CC-BLE]'
const BUFFER_LIMIT = 200
const buffer: BleLogEvent[] = []
const DEV = import.meta.env.DEV

function push(event: BleLogEvent) {
  buffer.push(event)
  if (buffer.length > BUFFER_LIMIT) buffer.shift()
}

function nowMeta(): Pick<BleLogEvent, 't' | 'iso'> {
  const t = Date.now()
  return { t, iso: new Date(t).toISOString() }
}

export function bleLog(tag: string, data: Record<string, unknown> = {}): void {
  const meta = nowMeta()
  const event: BleLogEvent = { ...meta, level: 'info', tag, data }
  push(event)
  if (DEV) console.log(`${TAG} ${tag}`, { ...meta, ...data })
}

export function bleWarn(tag: string, data: Record<string, unknown> = {}): void {
  const meta = nowMeta()
  const event: BleLogEvent = { ...meta, level: 'warn', tag, data }
  push(event)
  if (DEV) console.warn(`${TAG} ${tag}`, { ...meta, ...data })
}

export function bleError(tag: string, err: unknown, data: Record<string, unknown> = {}): void {
  const meta = nowMeta()
  const errObj =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { value: String(err) }
  const event: BleLogEvent = {
    ...meta,
    level: 'error',
    tag,
    data: { ...data, error: errObj },
  }
  push(event)
  if (DEV) console.error(`${TAG} ${tag}`, { ...meta, ...data, error: errObj })
}

export function bleTrace(tag: string, data: Record<string, unknown> = {}): void {
  const meta = nowMeta()
  const stack = new Error('trace').stack ?? ''
  const event: BleLogEvent = { ...meta, level: 'info', tag, data: { ...data, stack } }
  push(event)
  if (DEV) {
    console.groupCollapsed(`${TAG} ${tag}`)
    console.log({ ...meta, ...data })
    console.trace('trace')
    console.groupEnd()
  }
}

export function bleGetLog(): BleLogEvent[] {
  return buffer.slice()
}

export function bleDumpLog(): string {
  return buffer.map((e) => `${e.iso} [${e.level}] ${e.tag} ${JSON.stringify(e.data)}`).join('\n')
}

if (DEV && typeof window !== 'undefined') {
  // Expose helpers for quick inspection from DevTools console (dev builds only).
  // Usage: copy(window.__ccBleDump()) — paste anywhere to share.
  ;(window as unknown as Record<string, unknown>).__ccBleLog = bleGetLog
  ;(window as unknown as Record<string, unknown>).__ccBleDump = bleDumpLog
}
