<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { pctOfMax, zoneAt, zonesFor } from '@/lib/zones'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  bpm: number
  yob: number | null
}>()

const settings = useSettingsStore()
const { t } = useI18n()

const table = computed(() => zonesFor(props.yob, settings.state.maxHrFormula))
const currentZone = computed(() => zoneAt(props.bpm, props.yob, settings.state.maxHrFormula))

const markerPos = computed(() => {
  const tbl = table.value
  const min = tbl.ranges[0].from
  const range = tbl.maxHr - min
  if (range <= 0) return 0
  return Math.max(0, Math.min(1, (props.bpm - min) / range))
})

const pct = computed(() => pctOfMax(props.bpm, props.yob, settings.state.maxHrFormula))

const zoneLabel = computed(() =>
  t('zones.label', {
    z: currentZone.value.z,
    name: t(`zones.${currentZone.value.name}`),
  }),
)
</script>

<template>
  <div class="zone-ribbon">
    <div class="zone-ribbon-bar">
      <div
        v-for="r in table.ranges"
        :key="r.z"
        class="zone-ribbon-seg"
        :style="{ background: r.color, opacity: 0.4 }"
      />
      <div
        class="zone-ribbon-marker"
        :style="
          { left: `${markerPos * 100}%`, '--zone-c': currentZone.color } as Record<string, string>
        "
      />
    </div>
    <div class="zone-ribbon-label">
      <span :style="{ color: currentZone.color, fontWeight: 600 }">{{ zoneLabel }}</span>
      <span style="color: var(--d-text-3)">{{ pct }}% Max</span>
    </div>
  </div>
</template>
