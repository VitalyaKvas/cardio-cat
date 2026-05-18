<script setup lang="ts">
import VChart from 'vue-echarts'
import { useSettingsStore } from '@/stores/settings'
import { hexToRgba } from '@/lib/color'
import { isMeasured, SAMPLE_LIVE, SAMPLE_STALE_DARK } from '@/lib/sampleStatus'
import { formatClockHm, formatClockTime, formatMmSs } from '@/lib/time'
import { clampTooltipToViewport } from '@/lib/echartsTooltip'
import { zoneAt, zonesFor } from '@/lib/zones'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    history: number[]
    historyStatus?: number[]
    kcalHistory?: number[]
    color: string
    maxHr: number
    yob?: number | null
    elapsedSeconds?: number
    /**
     * Wall-clock timestamp (ms) of the session's start. Required so the chart
     * can show the user real time alongside elapsed workout time.
     */
    startedAt: number
    minBpmAxis?: number
  }>(),
  {
    minBpmAxis: 70,
    yob: null,
    elapsedSeconds: 0,
    kcalHistory: () => [],
    historyStatus: () => [],
  },
)

const settings = useSettingsStore()

const STALE_COLOR = '#7c7466'
const STALE_DARK_COLOR = '#1a1a1a'
const TT_LABEL = '#a89b80'
const TT_VAL = '#f6f1e8'

function nonMeasuredColor(s: number | undefined): string {
  return s === SAMPLE_STALE_DARK ? STALE_DARK_COLOR : STALE_COLOR
}

const host = ref<HTMLElement | null>(null)
const positionTooltip = clampTooltipToViewport(host)

function realTimeFor(elapsedSec: number): number {
  return props.startedAt + Math.round(elapsedSec) * 1000
}

const option = computed(() => {
  const zt = zonesFor(props.yob, settings.state.maxHrFormula)
  const N = props.history.length
  const oldestT = Math.max(0, props.elapsedSeconds - (N - 1))
  const statuses = props.historyStatus
  const hasStatus = statuses.length === N
  const kcal = props.kcalHistory

  const data: Array<[number, number]> = props.history.map((v, i) => [oldestT + i, v])
  const last = data.length ? data[data.length - 1] : null
  const lastStatus = hasStatus ? statuses[N - 1] : SAMPLE_LIVE
  const lastMeasured = isMeasured(lastStatus)
  const lastColor = last
    ? lastMeasured
      ? zoneAt(last[1], props.yob, settings.state.maxHrFormula).color
      : nonMeasuredColor(lastStatus)
    : null

  const stalePoints: Array<[number, number]> = []
  const staleDarkPoints: Array<[number, number]> = []
  if (hasStatus) {
    for (let i = 0; i < N; i++) {
      const st = statuses[i]
      if (st === SAMPLE_STALE_DARK) staleDarkPoints.push([oldestT + i, props.history[i]])
      else if (!isMeasured(st)) stalePoints.push([oldestT + i, props.history[i]])
    }
  }

  const zoneColors = zt.ranges.map((r) => r.color)
  const visualMin = zt.ranges[0].from
  const visualMax = zt.maxHr

  return {
    animation: false,
    grid: { left: 8, right: 14, top: 14, bottom: 28 },
    xAxis: {
      type: 'value',
      show: true,
      min: data.length ? data[0][0] : 0,
      max: data.length ? Math.max(data[data.length - 1][0], data[0][0] + 60) : 60,
      // Hide tick line clutter; only the real-time labels are useful here.
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: TT_LABEL,
        fontSize: 9,
        margin: 8,
        hideOverlap: true,
        formatter: (val: number) => formatClockHm(realTimeFor(val)),
      },
    },
    yAxis: [
      {
        type: 'value',
        show: false,
        min: Math.max(40, props.minBpmAxis - 10),
        max: props.maxHr + 20,
      },
      {
        type: 'value',
        show: false,
        min: 0,
        max: Math.max(10, kcal.length ? kcal[kcal.length - 1] * 1.25 : 10),
      },
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
      backgroundColor: 'rgba(20, 18, 14, 0.94)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: TT_VAL, fontSize: 11 },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      extraCssText: 'border-radius: 10px; padding: 8px 10px; max-width: 280px;',
      formatter: (params: Array<{ seriesIndex: number; data: [number, number] }>) => {
        const main = params.find((p) => p.seriesIndex === 0) ?? params[0]
        if (!main?.data) return ''
        const [tSec, bpm] = main.data
        const idx = Math.round(tSec - oldestT)
        const st = hasStatus ? statuses[idx] : SAMPLE_LIVE
        const measured = !hasStatus || isMeasured(st)
        const k = kcal[idx]
        // Tooltip background is dark, so we keep silent-source text in the
        // legible gray even for the dark virtual tier — the black is reserved
        // for the dot on the chart, not for body text.
        const sourceColor = measured ? props.color : STALE_COLOR
        const sourceLabel = measured ? t('chartTooltip.sourceLive') : t('chartTooltip.sourceSilent')
        const row = (label: string, value: string, valColor = TT_VAL) =>
          `<div style="display:flex;justify-content:space-between;gap:14px;margin:1px 0;">
            <span style="color:${TT_LABEL};">${label}</span>
            <span style="color:${valColor};font-weight:600;font-family:var(--f-mono, monospace);">${value}</span>
          </div>`
        return [
          row(t('chartTooltip.clock'), formatClockTime(realTimeFor(tSec))),
          row(t('chartTooltip.elapsed'), formatMmSs(tSec)),
          row(t('chartTooltip.bpm'), `${bpm} bpm`, measured ? TT_VAL : STALE_COLOR),
          typeof k === 'number'
            ? row(t('chartTooltip.kcal'), `~${Math.round(k)}`, settings.state.accentColor)
            : '',
          row(t('chartTooltip.source'), sourceLabel, sourceColor),
        ].join('')
      },
    },
    series: [
      {
        type: 'line',
        data,
        yAxisIndex: 0,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 4,
        smooth: false,
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(props.color, 0.35) },
              { offset: 1, color: hexToRgba(props.color, 0) },
            ],
          },
        },
        markPoint: last
          ? {
              symbol: 'circle',
              symbolSize: 12,
              data: [
                {
                  coord: last,
                  itemStyle: { color: lastColor ?? STALE_COLOR },
                  label: { show: false },
                },
              ],
            }
          : undefined,
      },
      {
        type: 'scatter',
        name: 'silent-light',
        data: stalePoints,
        yAxisIndex: 0,
        symbol: 'circle',
        symbolSize: 5,
        z: 5,
        itemStyle: { color: STALE_COLOR, borderColor: STALE_COLOR },
        tooltip: { show: false },
        silent: true,
      },
      {
        type: 'scatter',
        name: 'silent-dark',
        data: staleDarkPoints,
        yAxisIndex: 0,
        symbol: 'circle',
        symbolSize: 5,
        z: 5,
        itemStyle: { color: STALE_DARK_COLOR, borderColor: STALE_DARK_COLOR },
        tooltip: { show: false },
        silent: true,
      },
      {
        type: 'line',
        name: 'kcal',
        data: kcal.map((v, i) => [oldestT + i, v]),
        yAxisIndex: 1,
        showSymbol: false,
        smooth: true,
        z: 2,
        lineStyle: { color: settings.state.accentColor, width: 1.4, type: 'dashed' },
        tooltip: { show: false },
      },
    ],
  }
})
</script>

<template>
  <div ref="host" style="width: 100%; height: 100%">
    <VChart :option="option" autoresize style="width: 100%; height: 100%" />
  </div>
</template>
