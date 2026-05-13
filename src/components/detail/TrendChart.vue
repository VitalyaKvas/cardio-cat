<script setup lang="ts">
import VChart from 'vue-echarts'
import { hexToRgba } from '@/lib/color'
import { computed } from 'vue'

const props = defineProps<{
  values: number[]
  color: string
}>()

const option = computed(() => {
  const pts = props.values.map((v, i) => [i, v])
  return {
    animation: false,
    grid: { left: 20, right: 16, top: 16, bottom: 20 },
    xAxis: {
      type: 'value',
      show: true,
      min: 0,
      max: Math.max(1, pts.length - 1),
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: 'rgba(0,0,0,0.4)' },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
    },
    tooltip: { trigger: 'axis', appendToBody: true, confine: false },
    series: [
      {
        type: 'line',
        data: pts,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        smooth: true,
        lineStyle: { color: props.color, width: 2.5 },
        itemStyle: { color: props.color, borderColor: 'white', borderWidth: 2 },
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
      },
    ],
  }
})
</script>

<template>
  <div style="height: 200px">
    <VChart :option="option" autoresize style="width: 100%; height: 100%" />
  </div>
</template>
