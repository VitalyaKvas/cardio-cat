<script setup lang="ts">
import { isMeasured } from '@/lib/sampleStatus'
import { zoneAt } from '@/lib/zones'
import type { Session } from '@/stores/workout'
import { computed } from 'vue'

const props = defineProps<{
  session: Session
}>()

const segments = computed(() => {
  // Concatenate per-participant series side by side, dropping non-measured
  // (stale/gap) seconds so the intensity bar reflects only real readings.
  const flat: number[] = []
  for (const pid of Object.keys(props.session.bpmSeries)) {
    const series = props.session.bpmSeries[pid] ?? []
    const statuses = props.session.bpmStatus?.[pid]
    for (let i = 0; i < series.length; i++) {
      if (statuses && !isMeasured(statuses[i])) continue
      flat.push(series[i])
    }
  }
  if (!flat.length) return [] as Array<{ height: number; color: string }>
  const N = 24
  const step = Math.max(1, Math.floor(flat.length / N))
  const out: Array<{ height: number; color: string }> = []
  for (let i = 0; i < N; i++) {
    const v = flat[Math.min(flat.length - 1, i * step)] ?? 0
    const z = zoneAt(v, 1990)
    const height = Math.min(48, Math.max(6, (v - 80) / 2 + 8))
    out.push({ height, color: z.color })
  }
  return out
})
</script>

<template>
  <div class="session-bar">
    <span
      v-for="(s, i) in segments"
      :key="i"
      class="session-bar-seg"
      :style="{ height: `${s.height}px`, background: s.color }"
    />
  </div>
</template>
