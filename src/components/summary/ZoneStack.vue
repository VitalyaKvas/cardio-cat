<script setup lang="ts">
import { formatMinutes } from '@/lib/time'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  rows: Array<{
    z: number
    name: string
    color: string
    seconds: number
    pct: number
  }>
}>()
</script>

<template>
  <div class="zone-stack">
    <div v-for="r in rows" :key="r.z" class="zone-stack-row">
      <span class="zone-stack-pill" :style="{ background: r.color, color: 'white' }">
        Z{{ r.z }}
      </span>
      <span class="zone-stack-name">{{ t(`zones.${r.name}`) }}</span>
      <div class="zone-stack-bar" :style="{ background: r.color + '22' }">
        <div
          :style="{
            width: `${r.pct}%`,
            background: r.color,
            height: '100%',
            borderRadius: '999px',
          }"
        />
      </div>
      <span class="t-mono" style="font-size: 13px; width: 50px; text-align: right">
        {{ formatMinutes(r.seconds) }}
      </span>
      <span
        class="t-mono"
        style="font-size: 13px; width: 40px; text-align: right; color: var(--c-text-3)"
      >
        {{ r.pct }}%
      </span>
    </div>
  </div>
</template>
