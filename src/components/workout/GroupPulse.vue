<script setup lang="ts">
import GroupWave from '@/components/workout/GroupWave.vue'
import Icon from '@/components/ui/Icon.vue'
import { zoneAt, type Zone } from '@/lib/zones'
import { useSettingsStore } from '@/stores/settings'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    avgBpm: number
    count: number
    totalKcal: number
    avgYob?: number | null
    groupBpmSeries: number[]
    groupKcalSeries: number[]
    participantsData: Array<{
      id: string
      name: string
      color: string
      yob: number | null
      bpmSeries: number[]
      bpmStatus?: number[]
      kcalCumulative: number[]
    }>
    startedAt: number
  }>(),
  { avgYob: null },
)

const settings = useSettingsStore()

const zone = computed<Zone | { name: string; color: string }>(() => {
  if (!props.avgBpm) return { name: '—', color: '#a0a0a0' }
  return zoneAt(props.avgBpm, props.avgYob ?? 1990, settings.state.maxHrFormula)
})
</script>

<template>
  <div class="group-pulse">
    <div class="group-pulse-left">
      <div class="t-eyebrow" style="color: var(--d-text-3)">{{ t('groupPulse.title') }}</div>
      <div class="group-bpm">
        <span class="group-bpm-num t-mono">{{ avgBpm || '—' }}</span>
        <span class="group-bpm-unit">bpm</span>
      </div>
      <div class="group-zone-chip" :style="{ color: zone.color }">
        <span class="chip-dot" :style="{ background: zone.color }" />
        <span>{{
          t('groupPulse.avgZone', {
            name: zone.name === '—' ? '—' : t(`zones.${zone.name}`),
          })
        }}</span>
      </div>
    </div>

    <GroupWave
      :group-bpm="groupBpmSeries"
      :group-kcal="groupKcalSeries"
      :participants-data="participantsData"
      :avg-yob="avgYob"
      :started-at="startedAt"
    />

    <div class="group-pulse-right">
      <div class="metric-pill">
        <Icon name="flame" :size="16" color="var(--accent)" />
        <div>
          <div class="t-eyebrow" style="color: var(--d-text-3)">{{ t('groupPulse.kcal') }}</div>
          <div class="t-mono" style="font-size: 22px; font-weight: 700; line-height: 1">
            ~{{ totalKcal }}
          </div>
        </div>
      </div>
      <div class="metric-pill">
        <Icon name="users" :size="16" color="var(--c-blue)" />
        <div>
          <div class="t-eyebrow" style="color: var(--d-text-3)">
            {{ t('groupPulse.participants') }}
          </div>
          <div class="t-mono" style="font-size: 22px; font-weight: 700; line-height: 1">
            {{ count }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
