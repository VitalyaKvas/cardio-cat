<script setup lang="ts">
import VChart from 'vue-echarts'
import { useSettingsStore } from '@/stores/settings'
import { hexToRgba } from '@/lib/color'
import { zonesFor } from '@/lib/zones'
import { computed } from 'vue'

const props = defineProps<{
  bpm: number[]
  color: string
  yob: number | null
  durationSeconds: number
}>()

const settings = useSettingsStore()

const option = computed(() => {
  const SAMPLES = 200
  const N = props.bpm.length
  const step = N > SAMPLES ? N / SAMPLES : 1
  const pts: Array<[number, number]> = []
  if (N) {
    for (let i = 0; i < Math.min(SAMPLES, N); i++) {
      const idx = Math.min(N - 1, Math.floor(i * step))
      const x = (idx / Math.max(1, N - 1)) * props.durationSeconds
      pts.push([x, props.bpm[idx]])
    }
  }
  const zt = zonesFor(props.yob, settings.state.maxHrFormula)
  const markArea = {
    silent: true,
    data: zt.ranges.map((r) => [
      { yAxis: r.from, itemStyle: { color: hexToRgba(r.color, 0.06) } },
      { yAxis: r.to },
    ]),
  }
  return {
    animation: false,
    grid: { left: 8, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: 'value',
      min: 0,
      max: Math.max(60, props.durationSeconds),
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 70,
      max: zt.maxHr + 10,
      axisLine: { show: false },
      axisLabel: { color: 'rgba(0,0,0,0.4)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
    },
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      confine: false,
      formatter: (params: Array<{ data: [number, number] }>) => {
        if (!params?.length) return ''
        const p = params[0].data
        const m = Math.floor(p[0] / 60)
        const s = Math.round(p[0] % 60)
        return `${m}:${String(s).padStart(2, '0')} — <strong>${p[1]}</strong> bpm`
      },
    },
    series: [
      {
        type: 'line',
        data: pts,
        showSymbol: false,
        smooth: true,
        lineStyle: { color: props.color, width: 2.5 },
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
        markArea,
      },
    ],
  }
})
</script>

<template>
  <div class="session-graph">
    <VChart :option="option" autoresize style="width: 100%; height: 100%" />
  </div>
</template>
