import { i18nGlobal } from '@/i18n'

function currentLocale(): string {
  const loc = i18nGlobal.locale.value
  if (loc === 'crh') return 'tr'
  return loc
}

export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

export function formatClockTime(timestamp: number): string {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function formatClockHm(timestamp: number): string {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function formatMinutes(totalSeconds: number): string {
  const t = i18nGlobal.t
  const m = Math.floor(totalSeconds / 60)
  if (m < 60) return `${m} ${t('common.min')}`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0
    ? `${h} ${t('common.hour')}`
    : `${h} ${t('common.hour')} ${rest} ${t('common.min')}`
}

export function formatDayShort(timestamp: number): string {
  const d = new Date(timestamp)
  const month = new Intl.DateTimeFormat(currentLocale(), { month: 'short' }).format(d)
  return `${d.getDate()} ${month}`
}

export function formatDayLong(timestamp: number): string {
  const d = new Date(timestamp)
  const month = new Intl.DateTimeFormat(currentLocale(), { month: 'long' }).format(d)
  return `${d.getDate()} ${month} ${d.getFullYear()}`
}

export function formatDayContext(timestamp: number): string {
  const d = new Date(timestamp)
  const weekday = new Intl.DateTimeFormat(currentLocale(), { weekday: 'short' }).format(d)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${weekday}, ${hh}:${mm}`
}

export function relativeDay(timestamp: number, now = Date.now()): string {
  const t = i18nGlobal.t
  const diff = now - timestamp
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return t('time.today')
  if (days === 1) return t('time.yesterday')
  if (days < 7) return t('time.daysAgo', { n: days })
  if (days < 30) return t('time.weeksAgo', { n: Math.floor(days / 7) })
  return formatDayShort(timestamp)
}

export function todayHeader(now = Date.now()): string {
  const d = new Date(now)
  const month = new Intl.DateTimeFormat(currentLocale(), { month: 'short' }).format(d)
  const weekday = new Intl.DateTimeFormat(currentLocale(), { weekday: 'long' }).format(d)
  return `${d.getDate()} ${month} · ${weekday}`
}
