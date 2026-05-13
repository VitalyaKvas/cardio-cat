<script setup lang="ts">
import VChart from 'vue-echarts'
import { useSettingsStore } from '@/stores/settings'
import { hexToRgba } from '@/lib/color'
import { clampTooltipToViewport } from '@/lib/echartsTooltip'
import { isMeasured } from '@/lib/sampleStatus'
import { formatClockHm, formatClockTime, formatMmSs } from '@/lib/time'
import { maxHr, zoneAt, zonesFor } from '@/lib/zones'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type ParticipantData = {
  id: string
  name: string
  color: string
  yob: number | null
  bpmSeries: number[]
  bpmStatus?: number[]
  kcalCumulative: number[]
}

const props = withDefaults(
  defineProps<{
    groupBpm: number[]
    groupKcal: number[]
    participantsData: ParticipantData[]
    avgYob?: number | null
    startedAt: number
  }>(),
  { avgYob: null },
)

const settings = useSettingsStore()

const host = ref<HTMLElement | null>(null)
const positionTooltip = clampTooltipToViewport(host)

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  )
}

const hasData = computed(() => props.groupBpm.some((v) => v > 0))

const option = computed(() => {
  const zt = zonesFor(props.avgYob, settings.state.maxHrFormula)
  const maxHrValue = maxHr(props.avgYob, settings.state.maxHrFormula)
  const zoneColors = zt.ranges.map((r) => r.color)
  const visualMin = zt.ranges[0].from
  const visualMax = zt.maxHr

  const groupSeries: Array<[number, number]> = props.groupBpm.map((v, i) => [i, v])
  const kcalSeries: Array<[number, number]> = props.groupKcal.map((v, i) => [i, v])
  const maxKcal = props.groupKcal.length ? props.groupKcal[props.groupKcal.length - 1] : 0
  const T = Math.max(props.groupBpm.length, 60)

  const backgroundSeries = props.participantsData.map((p, idx) => ({
    type: 'line',
    name: `bg-${idx}`,
    data: p.bpmSeries.map((v, i) => [i, v]),
    showSymbol: false,
    smooth: true,
    z: 1,
    lineStyle: { color: hexToRgba(p.color, 0.32), width: 1 },
    yAxisIndex: 0,
    tooltip: { show: false },
  }))

  return {
    animation: false,
    grid: { left: 6, right: 8, top: 8, bottom: 22 },
    xAxis: {
      type: 'value',
      show: true,
      min: 0,
      max: T,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: '#7c7466',
        fontSize: 9,
        margin: 6,
        hideOverlap: true,
        formatter: (val: number) => formatClockHm(props.startedAt + Math.round(val) * 1000),
      },
    },
    yAxis: [
      { type: 'value', show: false, min: 40, max: maxHrValue + 20 },
      { type: 'value', show: false, min: 0, max: Math.max(20, maxKcal * 1.2) },
    ],
    visualMap: {
      type: 'continuous',
      show: false,
      dimension: 1,
      seriesIndex: 0,
      min: visualMin,
      max: visualMax,
      inRange: { color: zoneColors },
      outOfRange: { color: zoneColors[0] },
      calculable: false,
    },
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      confine: false,
      position: positionTooltip,
      backgroundColor: 'rgba(20, 18, 14, 0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#f6f1e8', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,0.25)' } },
      extraCssText:
        'border-radius: 10px; padding: 10px 12px; max-width: 320px; white-space: normal; z-index: 1000;',
      formatter: (params: Array<{ axisValue?: number; data?: [number, number] }>) => {
        if (!params?.length) return ''
        const idx = Math.round(params[0].axisValue ?? params[0].data?.[0] ?? 0)
        const tIdx = idx
        const realTime = formatClockTime(props.startedAt + tIdx * 1000)
        const header = `<div style="display:flex;justify-content:space-between;gap:14px;font-family:var(--f-mono, monospace);font-size:11px;color:#7c7466;letter-spacing:.05em;margin-bottom:8px;">
          <span>${t('chartTooltip.clock')} <span style="color:#f6f1e8;">${realTime}</span></span>
          <span>${t('chartTooltip.elapsed')} <span style="color:#f6f1e8;">${formatMmSs(tIdx)}</span></span>
        </div>`

        const rows: string[] = []
        let bpmSum = 0
        let bpmCount = 0
        let kcalTotal = 0
        for (const p of props.participantsData) {
          const v = p.bpmSeries[idx]
          const k = p.kcalCumulative[idx] ?? 0
          // Only measured (live) seconds count toward the group average; gap
          // seconds keep their cumulative kcal contribution.
          const measured = !p.bpmStatus || isMeasured(p.bpmStatus[idx])
          if (typeof v === 'number' && measured) {
            bpmSum += v
            bpmCount++
          }
          kcalTotal += k
          const z =
            typeof v === 'number' && measured ? zoneAt(v, p.yob, settings.state.maxHrFormula) : null
          const zoneLabel = z ? `Z${z.z} ${t(`zones.${z.name}`)}` : '—'
          const zoneColor = z?.color ?? '#7c7466'
          const sourceTag = measured
            ? ''
            : `<span style="color:#7c7466;font-size:10px;font-style:italic;">· ${t('chartTooltip.sourceSilent')}</span>`
          const bpmLabel = measured && typeof v === 'number' ? `${v} bpm` : '—'
          rows.push(
            `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:12px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>
              <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)} ${sourceTag}</span>
              <span style="color:${zoneColor};font-weight:600;">${bpmLabel}</span>
              <span style="color:${zoneColor};font-size:11px;">${zoneLabel}</span>
              <span style="color:${settings.state.accentColor};font-family:var(--f-mono, monospace);font-size:11px;">~${Math.round(k)}</span>
            </div>`,
          )
        }

        const avgBpm = bpmCount ? Math.round(bpmSum / bpmCount) : 0
        const avgZone = avgBpm
          ? zoneAt(avgBpm, props.avgYob ?? 1990, settings.state.maxHrFormula)
          : null
        const avgKcalPerson = props.participantsData.length
          ? Math.round(kcalTotal / props.participantsData.length)
          : 0

        const summary = `
          <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:8px;padding-top:8px;display:grid;grid-template-columns: 1fr auto;gap:4px 12px;font-size:12px;">
            <span style="color:#c8bfb1;">${t('groupWave.avgPulse')}</span>
            <span style="color:${avgZone?.color ?? '#c8bfb1'};font-weight:700;">${avgBpm || '—'} bpm</span>
            <span style="color:#c8bfb1;">${t('groupWave.avgZone')}</span>
            <span style="color:${avgZone?.color ?? '#c8bfb1'};font-weight:600;">${avgZone ? `Z${avgZone.z} ${t(`zones.${avgZone.name}`)}` : '—'}</span>
            <span style="color:#c8bfb1;">${t('groupWave.avgKcalPerson')}</span>
            <span style="color:${settings.state.accentColor};font-family:var(--f-mono, monospace);font-weight:700;">~${avgKcalPerson}</span>
            <span style="color:#c8bfb1;">${t('groupWave.totalKcal')}</span>
            <span style="color:${settings.state.accentColor};font-family:var(--f-mono, monospace);font-weight:700;">~${Math.round(kcalTotal)}</span>
          </div>`

        return `${header}${rows.join('')}${summary}`
      },
    },
    series: [
      {
        type: 'line',
        name: 'group',
        data: groupSeries,
        showSymbol: false,
        smooth: true,
        z: 3,
        lineStyle: { width: 2.5 },
        yAxisIndex: 0,
      },
      {
        type: 'line',
        name: 'kcal',
        data: kcalSeries,
        showSymbol: false,
        smooth: true,
        z: 2,
        lineStyle: { color: settings.state.accentColor, width: 1.5, type: 'dashed' },
        yAxisIndex: 1,
      },
      ...backgroundSeries,
    ],
  }
})
</script>

<template>
  <div ref="host" class="group-wave">
    <VChart v-if="hasData" :option="option" autoresize style="width: 100%; height: 100%" />
    <div v-else class="group-wave-empty">
      <span>{{ t('workout.groupEmpty') }}</span>
    </div>
  </div>
</template>
