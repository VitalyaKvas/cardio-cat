<script setup lang="ts">
import { BRAND_ACCENT } from '@/lib/color'
import { formatDayLong } from '@/lib/time'
import type { Session } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    sessions: Session[]
    weeks?: number
    color?: string
    intensityForMinutes?: (min: number) => number
  }>(),
  {
    weeks: 4,
    color: BRAND_ACCENT,
    intensityForMinutes: undefined,
  },
)

const WEEKDAY_LABELS = computed(() => t('heatmap.weekdays').split(','))

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function isoWeekday(ts: number): number {
  const d = new Date(ts)
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

type Cell = {
  minutes: number
  intensity: number
  date: number
  day: number
  future: boolean
}

const grid = computed(() => {
  const today = startOfDay(Date.now())
  const todayWeekday = isoWeekday(today)
  const thisWeekMonday = today - todayWeekday * 86400000

  const totalsByDay: Record<number, number> = {}
  for (const s of props.sessions) {
    if (!s.endedAt) continue
    const day = startOfDay(s.startedAt)
    const minutes = Math.round((s.endedAt - s.startedAt) / 60000)
    totalsByDay[day] = (totalsByDay[day] ?? 0) + minutes
  }

  const rows: Array<{ label: string; cells: Cell[] }> = []
  // Render newest week first so the current week sits at the top.
  for (let w = 0; w < props.weeks; w++) {
    const weekStart = thisWeekMonday - w * 7 * 86400000
    const cells: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const date = weekStart + d * 86400000
      const minutes = totalsByDay[date] ?? 0
      const intensity = props.intensityForMinutes
        ? props.intensityForMinutes(minutes)
        : Math.max(0, Math.min(1, minutes / 60))
      cells.push({
        minutes,
        intensity,
        date,
        day: new Date(date).getDate(),
        future: date > today,
      })
    }
    const label = w === 0 ? t('heatmap.current') : t('heatmap.weekShort', { n: w + 1 })
    rows.push({ label, cells })
  }
  return rows
})

function cellBackground(cell: Cell): string {
  // Future days reuse --c-warm-3 (darker than --c-warm) so they read as
  // "not yet" rather than "trained nothing", in both light and dark themes.
  if (cell.future) return 'var(--c-warm-3)'
  if (cell.intensity <= 0) return 'var(--c-warm)'
  const opacity = 0.15 + cell.intensity * 0.85
  return `color-mix(in oklch, ${props.color} ${Math.round(opacity * 100)}%, transparent)`
}

function cellTitle(cell: Cell): string {
  const date = formatDayLong(cell.date)
  if (cell.future) return date
  if (cell.minutes <= 0) return `${date} · ${t('heatmap.noTraining')}`
  return `${date} · ${cell.minutes} ${t('common.min')}`
}
</script>

<template>
  <div class="heatmap">
    <div class="heatmap-labels">
      <span />
      <span v-for="d in WEEKDAY_LABELS" :key="d">{{ d }}</span>
    </div>
    <div v-for="(row, idx) in grid" :key="idx" class="heatmap-row">
      <span class="heatmap-week-label">{{ row.label }}</span>
      <div
        v-for="(cell, ci) in row.cells"
        :key="ci"
        class="heatmap-cell"
        :class="{ 'heatmap-cell-future': cell.future }"
        :style="{ background: cellBackground(cell) }"
        :title="cellTitle(cell)"
      >
        <span class="heatmap-cell-day">{{ cell.day }}</span>
      </div>
    </div>
  </div>
</template>
