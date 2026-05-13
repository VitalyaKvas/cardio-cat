<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const zones = computed(() => [
  { z: 1, color: 'var(--zone-1)', name: t('zones.warmup') },
  { z: 2, color: 'var(--zone-2)', name: t('zones.fatBurn') },
  { z: 3, color: 'var(--zone-3)', name: t('zones.aerobic') },
  { z: 4, color: 'var(--zone-4)', name: t('zones.anaerobic') },
  { z: 5, color: 'var(--zone-5)', name: t('zones.max') },
])
</script>

<template>
  <div class="zone-legend">
    <span class="t-eyebrow" style="color: var(--d-text-3); flex-shrink: 0">{{
      t('zones.title')
    }}</span>
    <div class="zone-legend-items">
      <div v-for="z in zones" :key="z.z" class="zone-legend-item">
        <span class="zone-pill" :style="{ background: z.color }">Z{{ z.z }}</span>
        <span class="zone-legend-name">{{ z.name }}</span>
      </div>
    </div>
  </div>
</template>
