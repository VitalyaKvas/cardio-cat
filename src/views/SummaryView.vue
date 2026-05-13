<script setup lang="ts">
import BigStat from '@/components/summary/BigStat.vue'
import ParticipantSummaryCard from '@/components/summary/ParticipantSummaryCard.vue'
import Icon from '@/components/ui/Icon.vue'
import { kcalForBpm, kcalForSilentSeconds } from '@/lib/calories'
import { isMeasured } from '@/lib/sampleStatus'
import { formatMinutes } from '@/lib/time'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{ sessionId: string }>()

const store = useWorkoutStore()
const settings = useSettingsStore()
const router = useRouter()
const { t } = useI18n()

const session = computed(() => store.sessions[props.sessionId] ?? null)

const durationSec = computed(() => {
  const s = session.value
  if (!s?.endedAt) return 0
  return Math.round((s.endedAt - s.startedAt) / 1000)
})

const totalStats = computed(() => {
  const s = session.value
  if (!s) return { avg: 0, max: 0, kcal: 0 }
  let totalSum = 0
  let totalCount = 0
  let totalMax = 0
  let totalKcal = 0
  for (const pid of s.participantIds) {
    const series = s.bpmSeries[pid] ?? []
    if (!series.length) continue
    const statuses = s.bpmStatus?.[pid]
    let perSum = 0
    let perMax = 0
    let perCount = 0
    for (let i = 0; i < series.length; i++) {
      if (statuses && !isMeasured(statuses[i])) continue
      const v = series[i]
      perSum += v
      perCount++
      if (v > perMax) perMax = v
    }
    const perAvg = perCount > 0 ? Math.round(perSum / perCount) : 0
    const silentSec = Math.max(0, series.length - perCount)
    const participant = store.participants.find((p) => p.id === pid)
    if (participant) {
      if (perCount > 0) {
        totalKcal += kcalForBpm({
          bpm: perAvg,
          durationSeconds: perCount,
          yob: participant.yob,
          weight: participant.weight,
          sex: participant.sex,
          formula: settings.state.calorieFormula,
          maxHrFormula: settings.state.maxHrFormula,
        })
      }
      if (silentSec > 0) {
        totalKcal += kcalForSilentSeconds({
          seconds: silentSec,
          yob: participant.yob,
          weight: participant.weight,
          sex: participant.sex,
          formula: settings.state.calorieFormula,
          maxHrFormula: settings.state.maxHrFormula,
        })
      }
    }
    totalSum += perSum
    totalCount += perCount
    if (perMax > totalMax) totalMax = perMax
  }
  return {
    avg: totalCount ? Math.round(totalSum / totalCount) : 0,
    max: totalMax,
    kcal: totalKcal,
  }
})

const sessionParticipants = computed(() => {
  const s = session.value
  if (!s) return []
  return s.participantIds
    .map((id) => ({
      participant: store.participants.find((p) => p.id === id) ?? null,
      bpm: s.bpmSeries[id] ?? [],
      bpmStatus: s.bpmStatus?.[id],
    }))
    .filter((x) => x.participant)
})
</script>

<template>
  <div class="page">
    <div class="shell" style="padding-top: 32px; padding-bottom: 80px">
      <template v-if="session && session.endedAt">
        <div class="summary-hero">
          <div class="t-eyebrow" style="display: inline-flex; align-items: center; gap: 8px">
            <span style="font-size: 18px">🏁</span>
            {{ t('summaryView.complete') }}
          </div>
          <h1 class="t-h1" style="margin-top: 8px">{{ t('summaryView.greatWork') }}</h1>
          <div
            class="row"
            style="margin-top: 18px; gap: 24px; color: var(--c-text-3); flex-wrap: wrap"
          >
            <span>⏱ {{ formatMinutes(durationSec) }}</span>
            <span>
              👥 {{ t('summaryView.participantsLabel', { n: sessionParticipants.length }) }}
            </span>
          </div>

          <div class="summary-stats">
            <BigStat
              :label="t('summaryView.avgPulse')"
              :value="totalStats.avg || '—'"
              unit="bpm"
              tone="text"
            />
            <BigStat
              :label="t('summaryView.max')"
              :value="totalStats.max || '—'"
              unit="bpm"
              tone="crimson"
            />
            <BigStat
              :label="t('summaryView.kcalGroup')"
              :value="`~${totalStats.kcal}`"
              :unit="t('summaryView.kcalUnit')"
              tone="tangerine"
            />
            <BigStat
              :label="t('summaryView.duration')"
              :value="Math.round(durationSec / 60)"
              :unit="t('summaryView.minUnit')"
              tone="green"
            />
          </div>
        </div>

        <h2 class="t-h2" style="margin-top: 56px; margin-bottom: 20px">
          {{ t('summaryView.byParticipants') }}
        </h2>
        <div class="summary-grid">
          <ParticipantSummaryCard
            v-for="row in sessionParticipants"
            :key="row.participant!.id"
            :p="row.participant!"
            :bpm="row.bpm"
            :bpm-status="row.bpmStatus"
            :duration-seconds="durationSec"
          />
        </div>

        <div class="row" style="margin-top: 40px; justify-content: center; gap: 12px">
          <button class="btn btn-soft" @click="router.push({ name: 'home' })">
            <Icon name="arrow-left" :size="14" /> {{ t('summaryView.backHome') }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="empty">
          <div class="empty-glyph">🤷</div>
          <h2 class="t-h2">{{ t('summaryView.notFound') }}</h2>
          <p class="t-caption" style="margin-bottom: 24px">{{ t('summaryView.notFoundHint') }}</p>
          <button class="btn btn-cta" @click="router.push({ name: 'home' })">
            <Icon name="arrow-left" :size="14" /> {{ t('summaryView.backHome') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
