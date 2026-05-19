<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import KV from '@/components/ui/KV.vue'
import Heatmap from '@/components/dashboard/Heatmap.vue'
import ProfileStat from '@/components/detail/ProfileStat.vue'
import TrendChart from '@/components/detail/TrendChart.vue'
import { useParticipantBle } from '@/composables/useParticipantBle'
import { aggregateParticipantSeries } from '@/lib/stats'
import { formatDayShort, formatMinutes, relativeDay } from '@/lib/time'
import { ageFromYob, maxHr } from '@/lib/zones'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{ id: string }>()

const store = useWorkoutStore()
const settings = useSettingsStore()
const ui = useUiStore()
const ble = useParticipantBle()
const router = useRouter()
const { t } = useI18n()

const participant = computed(() => store.participants.find((p) => p.id === props.id) ?? null)

const sessionsForParticipant = computed(() =>
  store.orderedSessions.filter((s) => s.participantIds.includes(props.id)),
)

type SessionAgg = {
  id: string
  startedAt: number
  endedAt: number
  durationMin: number
  avg: number
  max: number
  kcal: number
}

const aggregated = computed<SessionAgg[]>(() => {
  const who = participant.value
  if (!who) return []
  const out: SessionAgg[] = []
  for (const s of sessionsForParticipant.value) {
    if (!s.endedAt) continue
    const series = s.bpmSeries[props.id] ?? []
    if (!series.length) continue
    const statuses = s.bpmStatus?.[props.id]
    const durationSec = Math.round((s.endedAt - s.startedAt) / 1000)
    const stats = aggregateParticipantSeries({
      series,
      statuses,
      participant: who,
      durationSeconds: durationSec,
      formula: settings.state.calorieFormula,
      maxHrFormula: settings.state.maxHrFormula,
    })
    out.push({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMin: Math.round(durationSec / 60),
      avg: stats.avg,
      max: stats.max,
      kcal: stats.kcal,
    })
  }
  return out
})

const totals = computed(() => {
  let totalSec = 0
  let bpmSum = 0
  let bpmCount = 0
  let kcal = 0
  for (const a of aggregated.value) {
    const dur = (a.endedAt - a.startedAt) / 1000
    totalSec += dur
    bpmSum += a.avg * dur
    bpmCount += dur
    kcal += a.kcal
  }
  return {
    sessions: aggregated.value.length,
    totalSec,
    avgBpm: bpmCount ? Math.round(bpmSum / bpmCount) : 0,
    kcal,
  }
})

const trendValues = computed(() =>
  aggregated.value
    .slice()
    .reverse()
    .map((a) => a.avg),
)

function openEdit() {
  if (participant.value) ui.openModal({ kind: 'edit_participant', id: participant.value.id })
}

function goSummary(id: string) {
  router.push({ name: 'workout-summary', params: { sessionId: id } })
}

function askDeleteSession(e: Event, id: string) {
  e.stopPropagation()
  ui.openModal({ kind: 'delete_session', id })
}

function addDevice() {
  if (participant.value) void ble.addBleDevice(participant.value.id)
}

function unlinkDevice(deviceId: string, deviceName: string | null | undefined) {
  if (!participant.value) return
  ble.removeBleDevice(participant.value.id, deviceId)
  ui.pushToast(
    'info',
    t('participant.disconnectedToast', { name: deviceName || t('participant.deviceFallback') }),
  )
}
</script>

<template>
  <div class="page">
    <div class="shell" style="padding-top: 24px; padding-bottom: 80px">
      <template v-if="participant">
        <div class="row-sb" style="margin-bottom: 24px">
          <button class="btn btn-ghost" @click="router.push({ name: 'home' })">
            <Icon name="arrow-left" :size="14" /> {{ t('detailView.back') }}
          </button>
          <button class="btn btn-soft" @click="openEdit">
            <Icon name="edit" :size="14" /> {{ t('detailView.editProfile') }}
          </button>
        </div>

        <div
          class="profile-card"
          :style="{ '--c-accent': participant.color } as Record<string, string>"
        >
          <div class="profile-stripe" />
          <div class="profile-row">
            <Avatar :glyph="participant.avatar" :color="participant.color" size="xl" />
            <div style="flex: 1">
              <h1 class="t-h1" style="margin: 0">{{ participant.name }}</h1>
              <div
                class="row"
                style="gap: 20px; margin-top: 8px; color: var(--c-text-3); flex-wrap: wrap"
              >
                <span>
                  {{ ageFromYob(participant.yob) }}
                  {{ t('detailView.yob', { yob: participant.yob ?? '—' }) }}
                </span>
                <span>·</span>
                <span>
                  {{
                    t('detailView.maxHr', {
                      value: maxHr(participant.yob, settings.state.maxHrFormula),
                    })
                  }}
                </span>
                <span>·</span>
                <span>{{ participant.weight ?? '—' }} {{ t('detailView.kgUnit') }}</span>
                <span>·</span>
                <span>
                  {{
                    participant.sex === 'F'
                      ? t('participant.sexFemaleShort')
                      : participant.sex === 'M'
                        ? t('participant.sexMaleShort')
                        : t('participant.sexUnknownShort')
                  }}
                </span>
              </div>
              <div class="row" style="gap: 10px; margin-top: 16px; flex-wrap: wrap">
                <span
                  v-for="d in participant.ble"
                  :key="d.id"
                  class="chip"
                  style="padding: 4px 6px 4px 12px; gap: 8px"
                  :style="
                    { background: `${participant.color}1a`, color: participant.color } as Record<
                      string,
                      string
                    >
                  "
                >
                  <Icon name="bluetooth" :size="12" />
                  <span>{{ d.name || t('participant.deviceFallback') }}</span>
                  <button
                    class="icon-btn-sm"
                    style="width: 24px; height: 24px; border-radius: 8px"
                    :title="t('participant.unlinkDevice')"
                    @click="unlinkDevice(d.id, d.name)"
                  >
                    <Icon name="trash" :size="12" />
                  </button>
                </span>
                <button
                  class="btn btn-soft"
                  style="padding: 8px 14px; font-size: 12px"
                  @click="addDevice"
                >
                  <Icon name="plus" :size="12" /> {{ t('detailView.addDevice') }}
                </button>
              </div>
            </div>
          </div>

          <div class="profile-stats">
            <ProfileStat :label="t('detailView.sessions')" :value="totals.sessions" />
            <ProfileStat :label="t('detailView.total')" :value="formatMinutes(totals.totalSec)" />
            <ProfileStat :label="t('detailView.avgHeart')" :value="totals.avgBpm || '—'" />
            <ProfileStat :label="t('detailView.kcal')" :value="`~${totals.kcal}`" />
            <ProfileStat
              :label="t('detailView.last')"
              :value="aggregated[0] ? relativeDay(aggregated[0].startedAt) : '—'"
              tone="tangerine"
            />
          </div>
        </div>

        <div class="profile-grid">
          <div class="card card-pad">
            <div class="t-eyebrow">{{ t('detailView.activity') }}</div>
            <h3 class="t-h3" style="margin: 6px 0 18px">{{ t('detailView.last8Weeks') }}</h3>
            <Heatmap :sessions="sessionsForParticipant" :color="participant.color" />
          </div>
          <div class="card card-pad">
            <div class="t-eyebrow">{{ t('detailView.trend') }}</div>
            <h3 class="t-h3" style="margin: 6px 0 18px">{{ t('detailView.avgBpmPerSession') }}</h3>
            <TrendChart
              v-if="trendValues.length"
              :values="trendValues"
              :color="participant.color"
            />
            <div v-else class="empty">
              <div class="empty-glyph">📈</div>
              <p class="t-caption">{{ t('detailView.noTrend') }}</p>
            </div>
          </div>
        </div>

        <div class="card card-pad" style="margin-top: 16px">
          <h3 class="t-h3" style="margin: 0 0 18px">{{ t('detailView.allWorkouts') }}</h3>
          <div v-if="aggregated.length === 0" class="empty">
            <div class="empty-glyph">🐾</div>
            <p class="t-caption">{{ t('detailView.noWorkoutsHint') }}</p>
          </div>
          <div v-else class="session-list session-list-compact">
            <div v-for="s in aggregated" :key="s.id" class="session-row" @click="goSummary(s.id)">
              <div class="session-date">
                <div class="t-mono" style="font-size: 18px; font-weight: 700">
                  {{ formatDayShort(s.startedAt).split(' ')[0] }}
                </div>
                <div class="t-caption">{{ formatDayShort(s.startedAt).split(' ')[1] }}</div>
              </div>
              <div class="session-meta">
                <KV
                  :k="t('detailView.duration')"
                  :v="`${s.durationMin} ${t('detailView.minUnit')}`"
                />
                <KV :k="t('detailView.avgHeart')" :v="s.avg" />
                <KV :k="t('detailView.maxHeart')" :v="s.max" />
                <KV :k="t('detailView.kcalLabel')" :v="`~${s.kcal}`" tone="tangerine" />
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
      </template>

      <template v-else>
        <div class="empty">
          <div class="empty-glyph">🤷</div>
          <h2 class="t-h2">{{ t('detailView.notFound') }}</h2>
          <button class="btn btn-cta" @click="router.push({ name: 'home' })">
            <Icon name="arrow-left" :size="14" /> {{ t('detailView.backHome') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
