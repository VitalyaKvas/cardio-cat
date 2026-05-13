<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import SessionGraph from '@/components/summary/SessionGraph.vue'
import ZoneStack from '@/components/summary/ZoneStack.vue'
import { isMeasured } from '@/lib/sampleStatus'
import { aggregateParticipantSeries } from '@/lib/stats'
import { ageFromYob, maxHr, zonesFor } from '@/lib/zones'
import { useSettingsStore } from '@/stores/settings'
import type { Participant } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  p: Participant
  bpm: number[]
  bpmStatus?: number[]
  durationSeconds: number
}>()

const settings = useSettingsStore()

const age = computed(() => ageFromYob(props.p.yob))
const maxHrLabel = computed(() => maxHr(props.p.yob, settings.state.maxHrFormula))

const computedStats = computed(() =>
  aggregateParticipantSeries({
    series: props.bpm,
    statuses: props.bpmStatus,
    participant: props.p,
    durationSeconds: props.durationSeconds,
    formula: settings.state.calorieFormula,
    maxHrFormula: settings.state.maxHrFormula,
  }),
)

const zoneRows = computed(() => {
  const zt = zonesFor(props.p.yob, settings.state.maxHrFormula)
  const counts = [0, 0, 0, 0, 0]
  let measuredTotal = 0
  for (let idx = 0; idx < props.bpm.length; idx++) {
    if (props.bpmStatus && !isMeasured(props.bpmStatus[idx])) continue
    measuredTotal++
    const v = props.bpm[idx]
    for (let i = 0; i < zt.ranges.length; i++) {
      const r = zt.ranges[i]
      if (v >= r.from && v <= r.to) {
        counts[i]++
        break
      }
    }
  }
  const total = measuredTotal || 1
  return zt.ranges.map((r, i) => ({
    z: r.z,
    name: r.name,
    color: r.color,
    seconds: counts[i],
    pct: Math.round((counts[i] / total) * 100),
  }))
})
</script>

<template>
  <div class="card card-pad" :style="{ '--c-accent': p.color } as Record<string, string>">
    <div class="row" style="gap: 14px; flex-wrap: wrap">
      <Avatar :glyph="p.avatar" :color="p.color" size="lg" />
      <div style="flex: 1">
        <h3 class="t-h3" style="margin: 0">{{ p.name }}</h3>
        <div class="t-caption">
          {{
            t('participantSummary.profileLine', {
              age,
              weight: p.weight ?? '—',
              maxHr: maxHrLabel,
            })
          }}
        </div>
      </div>
      <div class="row" style="gap: 20px">
        <div style="text-align: center">
          <div class="t-eyebrow">avg</div>
          <div class="t-mono" style="font-size: 24px; font-weight: 700">
            {{ computedStats.avg || '—' }}
          </div>
        </div>
        <div style="text-align: center">
          <div class="t-eyebrow">max</div>
          <div class="t-mono" style="font-size: 24px; font-weight: 700; color: var(--c-crimson)">
            {{ computedStats.max || '—' }}
          </div>
        </div>
        <div style="text-align: center">
          <div class="t-eyebrow">{{ t('participantSummary.kcalEyebrow') }}</div>
          <div class="t-mono" style="font-size: 24px; font-weight: 700; color: var(--accent)">
            ~{{ computedStats.kcal }}
          </div>
        </div>
      </div>
    </div>

    <div class="divider" />
    <div class="t-eyebrow" style="margin-bottom: 10px">{{ t('participantSummary.zonesTime') }}</div>
    <ZoneStack :rows="zoneRows" />

    <div class="divider" />
    <div class="t-eyebrow" style="margin-bottom: 10px">
      {{ t('participantSummary.pulseSession') }}
    </div>
    <SessionGraph :bpm="bpm" :color="p.color" :yob="p.yob" :duration-seconds="durationSeconds" />
  </div>
</template>
