<script setup lang="ts">
import Heatmap from '@/components/dashboard/Heatmap.vue'
import SessionIntensityBar from '@/components/dashboard/SessionIntensityBar.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import KV from '@/components/ui/KV.vue'
import { isMeasured } from '@/lib/sampleStatus'
import { aggregateParticipantSeries } from '@/lib/stats'
import { formatDayShort, formatMinutes } from '@/lib/time'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const store = useWorkoutStore()
const settings = useSettingsStore()
const ui = useUiStore()
const router = useRouter()
const { t } = useI18n()

type AggPerParticipant = {
  pid: string
  sessions: number
  totalMin: number
  totalSec: number
  bpmSum: number
  bpmCount: number
}

const aggregated = computed(() => {
  const map = new Map<string, AggPerParticipant>()
  for (const s of store.orderedSessions) {
    if (!s.endedAt) continue
    const durationSec = Math.round((s.endedAt - s.startedAt) / 1000)
    for (const pid of s.participantIds) {
      const series = s.bpmSeries[pid] ?? []
      const statuses = s.bpmStatus?.[pid]
      const cur = map.get(pid) ?? {
        pid,
        sessions: 0,
        totalMin: 0,
        totalSec: 0,
        bpmSum: 0,
        bpmCount: 0,
      }
      cur.sessions += 1
      cur.totalSec += durationSec
      cur.totalMin += Math.round(durationSec / 60)
      for (let i = 0; i < series.length; i++) {
        if (statuses && !isMeasured(statuses[i])) continue
        cur.bpmSum += series[i]
        cur.bpmCount++
      }
      map.set(pid, cur)
    }
  }
  return Array.from(map.values())
})

const top3 = computed(() => {
  const ranked = aggregated.value
    .map((a) => ({
      ...a,
      avg: a.bpmCount ? Math.round(a.bpmSum / a.bpmCount) : 0,
      participant: store.participants.find((p) => p.id === a.pid) ?? null,
    }))
    .filter((x) => x.participant)
    .sort((a, b) => b.sessions - a.sessions || b.totalSec - a.totalSec)
  return ranked.slice(0, 3)
})

const allSessions = computed(() => store.orderedSessions)

function sessionParticipantStack(s: (typeof allSessions.value)[number]) {
  const visible = s.participantIds
    .slice(0, 3)
    .map((pid) => store.participants.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
  const overflow = Math.max(0, s.participantIds.length - 3)
  return { visible, overflow }
}

function sessionStats(s: (typeof allSessions.value)[number]) {
  const durationSec = s.endedAt ? Math.round((s.endedAt - s.startedAt) / 1000) : 0
  let bpmSum = 0
  let bpmCount = 0
  let bpmMax = 0
  let kcal = 0
  for (const pid of s.participantIds) {
    const series = s.bpmSeries[pid] ?? []
    if (!series.length) continue
    const statuses = s.bpmStatus?.[pid]
    const participant = store.participants.find((p) => p.id === pid) ?? null
    const stats = aggregateParticipantSeries({
      series,
      statuses,
      participant,
      durationSeconds: durationSec,
      formula: settings.state.calorieFormula,
      maxHrFormula: settings.state.maxHrFormula,
    })
    bpmSum += stats.rawSum
    bpmCount += stats.sampleCount
    if (stats.max > bpmMax) bpmMax = stats.max
    kcal += stats.kcal
  }
  return {
    durationMin: Math.round(durationSec / 60),
    participants: s.participantIds.length,
    avgBpm: bpmCount ? Math.round(bpmSum / bpmCount) : 0,
    maxBpm: bpmMax,
    kcal,
  }
}

const activeDays = computed(() => {
  const set = new Set<number>()
  for (const s of store.orderedSessions) {
    if (!s.endedAt) continue
    const d = new Date(s.startedAt)
    d.setHours(0, 0, 0, 0)
    set.add(d.getTime())
  }
  return set.size
})

const totalDuration = computed(() => {
  let total = 0
  for (const s of store.orderedSessions) {
    if (s.endedAt) total += Math.round((s.endedAt - s.startedAt) / 1000)
  }
  return total
})

function goSummary(id: string) {
  router.push({ name: 'workout-summary', params: { sessionId: id } })
}

function askDeleteSession(e: Event, id: string) {
  e.stopPropagation()
  ui.openModal({ kind: 'delete_session', id })
}
</script>

<template>
  <div class="stats-grid">
    <div class="card card-pad heatmap-card">
      <div class="row-sb mb-5">
        <div>
          <div class="t-eyebrow">{{ t('statsT.activity') }}</div>
          <h3 class="t-h3 mt-1.5">{{ t('stats.last8Weeks') }}</h3>
        </div>
        <div class="row gap-2">
          <span class="t-caption">{{ t('statsT.less') }}</span>
          <div class="legend-strip">
            <span
              v-for="v in [0.1, 0.3, 0.55, 0.8, 1]"
              :key="v"
              class="legend-cell"
              :style="{ background: `rgba(255,84,6,${v})` }"
            />
          </div>
          <span class="t-caption">{{ t('statsT.more') }}</span>
        </div>
      </div>

      <Heatmap :sessions="store.orderedSessions" />

      <div class="row mt-4 gap-6">
        <KV :k="t('statsT.activeDays')" :v="activeDays" />
        <KV :k="t('statsT.total')" :v="formatMinutes(totalDuration)" tone="tangerine" />
      </div>
    </div>

    <div class="card card-pad">
      <div class="t-eyebrow">{{ t('statsT.leaderboard') }}</div>
      <h3 class="t-h3 mt-1.5 mb-4">{{ t('statsT.top3') }}</h3>
      <div v-if="top3.length === 0" class="empty">
        <div class="empty-glyph">🐱</div>
        <h3 class="t-h3">{{ t('statsT.noSessions') }}</h3>
        <p class="t-caption">{{ t('statsT.noSessionsHint') }}</p>
      </div>
      <div v-else class="top-list">
        <div v-for="(top, i) in top3" :key="top.pid" class="top-row">
          <span class="text-[28px]">{{ ['🥇', '🥈', '🥉'][i] }}</span>
          <Avatar
            v-if="top.participant"
            :glyph="top.participant.avatar"
            :color="top.participant.color"
          />
          <div class="flex-1">
            <div class="font-bold text-base">{{ top.participant!.name }}</div>
            <div class="t-caption">
              {{ top.sessions }} {{ t('statsT.sessionsLabel') }} ·
              {{ formatMinutes(top.totalSec) }}
            </div>
          </div>
          <div class="text-right">
            <div class="t-mono font-bold text-xl">{{ top.avg || '—' }}</div>
            <div class="t-caption">{{ t('stats.avgHeart') }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card card-pad col-span-full">
      <div class="row-sb mb-4">
        <div>
          <div class="t-eyebrow">{{ t('statsT.history') }}</div>
          <h3 class="t-h3 mt-1.5">{{ t('statsT.lastWorkouts') }}</h3>
        </div>
      </div>

      <div v-if="allSessions.length === 0" class="empty">
        <div class="empty-glyph">📈</div>
        <h3 class="t-h3">{{ t('statsT.noWorkouts') }}</h3>
        <p class="t-caption">{{ t('statsT.noWorkoutsHint') }}</p>
      </div>

      <div v-else class="session-list">
        <div v-for="s in allSessions" :key="s.id" class="session-row" @click="goSummary(s.id)">
          <div class="session-date">
            <div class="t-mono text-lg font-bold">
              {{ formatDayShort(s.startedAt).split(' ')[0] }}
            </div>
            <div class="t-caption">{{ formatDayShort(s.startedAt).split(' ')[1] }}</div>
          </div>
          <SessionIntensityBar :session="s" />
          <div class="session-meta">
            <KV
              :k="t('statsT.duration')"
              :v="`${sessionStats(s).durationMin} ${t('statsT.minUnit')}`"
            />
            <div class="kv">
              <div class="t-caption">{{ t('statsT.participants') }}</div>
              <div class="kv-participants">
                <div class="avatar-stack">
                  <div
                    v-for="(p, i) in sessionParticipantStack(s).visible"
                    :key="p.id"
                    class="avatar-stack-item"
                    :style="{ zIndex: 10 - i }"
                  >
                    <Avatar
                      :glyph="p.avatar"
                      :color="p.color"
                      size="sm"
                      class="custom-background"
                    />
                  </div>
                  <div
                    v-if="sessionParticipantStack(s).overflow > 0"
                    class="avatar-stack-item avatar-stack-more"
                    :style="{ zIndex: 10 - sessionParticipantStack(s).visible.length }"
                  >
                    +{{ sessionParticipantStack(s).overflow }}
                  </div>
                </div>
              </div>
            </div>
            <KV :k="t('statsT.avgHeart')" :v="sessionStats(s).avgBpm || '—'" />
            <KV :k="t('statsT.maxHeart')" :v="sessionStats(s).maxBpm || '—'" />
            <KV :k="t('statsT.kcal')" :v="`~${sessionStats(s).kcal}`" tone="tangerine" />
          </div>
          <div class="session-row-actions">
            <button
              class="icon-btn-sm session-delete"
              :title="t('statsT.deleteSession')"
              :aria-label="t('statsT.deleteSession')"
              @click="askDeleteSession($event, s.id)"
            >
              <Icon name="trash" :size="16" />
            </button>
            <Icon name="chevron-right" :size="18" color="var(--c-text-4)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
