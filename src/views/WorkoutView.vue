<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import CoachStrip from '@/components/workout/CoachStrip.vue'
import GroupPulse from '@/components/workout/GroupPulse.vue'
import WorkoutCard from '@/components/workout/WorkoutCard.vue'
import WorkoutHeader from '@/components/workout/WorkoutHeader.vue'
import ZoneLegend from '@/components/workout/ZoneLegend.vue'
import { useAudio } from '@/composables/useAudio'
import { useIntervalFn } from '@/composables/useIntervalFn'
import { useParticipantBle } from '@/composables/useParticipantBle'
import { kcalRatePerMinute, SILENT_BPM_ASSUMED } from '@/lib/calories'
import { isMeasured, SAMPLE_GAP, SAMPLE_LIVE, SAMPLE_STALE, SAMPLE_STALE_DARK } from '@/lib/sampleStatus'
import { aggregateParticipantSeries } from '@/lib/stats'
import { zoneAt } from '@/lib/zones'
import { formatTimer } from '@/lib/time'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore, type Participant } from '@/stores/workout'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{ sessionId: string }>()

const store = useWorkoutStore()
const ui = useUiStore()
const settings = useSettingsStore()
const router = useRouter()
const ble = useParticipantBle()
const audio = useAudio()
const { t } = useI18n()

const prevStale = new Set<string>()
const prevZ5 = new Set<string>()

const now = ref(Date.now())
const spotlightId = ref<string | null>(null)
const ticks = ref(0)

const session = computed(() => store.sessions[props.sessionId] ?? null)

useIntervalFn(
  () => {
    now.value = Date.now()
    ticks.value++
    flushBleSamples()
    detectAudioEvents()
  },
  1000,
  false,
)

watch(
  session,
  (s) => {
    if (!s && store.isActive === false) {
      router.replace({ name: 'home' })
    }
  },
  { immediate: true },
)

const elapsed = computed(() => {
  const s = session.value
  if (!s) return 0
  return Math.floor((now.value - s.startedAt) / 1000)
})

const participants = computed<Participant[]>(() => {
  const s = session.value
  if (!s) return []
  return s.participantIds
    .map((id) => store.participants.find((p) => p.id === id))
    .filter((p): p is Participant => !!p)
})

const pendingSamples = reactive<Record<string, number>>({})

const unsubscribeBpm = ble.addBpmListener((pid, bpm) => {
  pendingSamples[pid] = bpm
})

function detectAudioEvents() {
  const list = participants.value
  if (!list.length) return
  for (const p of list) {
    const hasBle = p.ble.length > 0
    const stale = hasBle && isStale(p.id)
    if (stale && !prevStale.has(p.id)) {
      audio.playStale()
      prevStale.add(p.id)
    } else if (!stale && prevStale.has(p.id)) {
      prevStale.delete(p.id)
    }

    const bpm = liveBpm(p.id) ?? 0
    const z = bpm > 0 ? zoneAt(bpm, p.yob, settings.state.maxHrFormula) : null
    const inZ5 = z != null && z.z === 5
    if (inZ5 && !prevZ5.has(p.id)) {
      audio.playZone5()
      prevZ5.add(p.id)
    } else if (!inZ5 && prevZ5.has(p.id)) {
      prevZ5.delete(p.id)
    }
  }
}

// Per-participant sampler bookkeeping. When the sensor goes silent we hold
// the last known bpm for up to VIRTUAL_DARK_MAX ticks total: the first
// VIRTUAL_LIGHT_MAX render as gray (short hiccup) and the rest render as
// dark (signal probably lost). After that we give up and emit a real 0 (gap).
type SamplerEntry = { lastLiveBpm: number | null; virtualCount: number }
const samplerState: Record<string, SamplerEntry> = {}
const VIRTUAL_LIGHT_MAX = 10
const VIRTUAL_DARK_MAX = 20

function getSamplerState(pid: string): SamplerEntry {
  if (!samplerState[pid]) samplerState[pid] = { lastLiveBpm: null, virtualCount: 0 }
  return samplerState[pid]
}

function flushBleSamples() {
  const s = session.value
  if (!s) return
  for (const pid of s.participantIds) {
    const sample = pendingSamples[pid]
    const hasNew = typeof sample === 'number'
    if (hasNew) delete pendingSamples[pid]
    const state = getSamplerState(pid)

    // Disconnect goes straight to 0 — no virtual hold, the user is offline.
    if (isLost(pid)) {
      store.appendBpmSample(pid, 0, SAMPLE_GAP)
      state.virtualCount = 0
      continue
    }

    // A reading of bpm > 0 counts as real measurement. A reading of 0 from
    // the sensor is treated as "no new pulse" — same as no sample at all,
    // since the sensor reported old/zero data.
    if (hasNew && (sample as number) > 0) {
      const newBpm = sample as number
      store.appendBpmSample(pid, newBpm, SAMPLE_LIVE)
      state.lastLiveBpm = newBpm
      state.virtualCount = 0
      continue
    }

    if (state.lastLiveBpm != null && state.virtualCount < VIRTUAL_DARK_MAX) {
      // Bridge the silence with the previous reading so the cardiogram
      // doesn't dive to zero. First VIRTUAL_LIGHT_MAX ticks render gray,
      // the rest render darker to flag "this is dragging".
      const status = state.virtualCount < VIRTUAL_LIGHT_MAX ? SAMPLE_STALE : SAMPLE_STALE_DARK
      store.appendBpmSample(pid, state.lastLiveBpm, status)
      state.virtualCount++
    } else {
      // Virtual budget exhausted (or no signal ever) → fall back to a real 0.
      store.appendBpmSample(pid, 0, SAMPLE_GAP)
    }
  }
}

function stats(pid: string): { avg: number; min: number | null; max: number | null; kcal: number } {
  const series = session.value?.bpmSeries[pid] ?? []
  if (!series.length) return { avg: 0, min: null, max: null, kcal: 0 }
  const statuses = session.value?.bpmStatus?.[pid]
  const participant = store.participants.find((p) => p.id === pid)
  const s = aggregateParticipantSeries({
    series,
    statuses,
    participant,
    formula: settings.state.calorieFormula,
    maxHrFormula: settings.state.maxHrFormula,
  })
  const hasMeasured = s.sampleCount > 0
  return {
    avg: s.avg,
    min: hasMeasured ? s.min : null,
    max: hasMeasured ? s.max : null,
    kcal: s.kcal,
  }
}

function liveBpm(pid: string): number | null {
  return ble.getCurrentBpmForParticipant(pid)
}

function isStale(pid: string): boolean {
  const p = store.participants.find((x) => x.id === pid)
  if (!p) return true
  if (!p.ble.length) return true
  for (const d of p.ble) {
    if (!ble.isStale(p.id, d.id)) return false
  }
  return true
}

function isLost(pid: string): boolean {
  const p = store.participants.find((x) => x.id === pid)
  if (!p || !p.ble.length) return false
  return p.ble.every((d) => ble.isLost(p.id, d.id))
}

function reconnectParticipant(pid: string) {
  const p = store.participants.find((x) => x.id === pid)
  if (!p || !p.ble[0]) return
  void ble.reconnectDevice(p.id, p.ble[0].id)
}

const workoutBodyStyle = computed<Record<string, string | number>>(() => ({
  '--wo-zoom': settings.state.workoutZoom,
}))

function historyFor(pid: string): number[] {
  const series = session.value?.bpmSeries[pid] ?? []
  const window = settings.state.chartWindowSeconds
  return series.slice(-window)
}

function historyStatusFor(pid: string): number[] {
  const statuses = session.value?.bpmStatus?.[pid]
  if (!statuses) return []
  const window = settings.state.chartWindowSeconds
  return statuses.slice(-window)
}

// Per-participant cumulative kcal cache (NON-reactive — manually maintained).
// Each entry is monotonically extended as new BPM samples arrive, so the
// per-tick kcalForBpm call goes from O(P·T) to O(P) per new sample.
// Invalidated on (a) formula change, (b) participant body data change
// (yob/weight/sex), and (c) participant removal.
const cumulativeKcalByPid: Record<string, number[]> = {}
const cacheBodyKey: Record<string, string> = {}

function bodyKeyOf(p: Pick<Participant, 'yob' | 'weight' | 'sex'>): string {
  return `${p.yob ?? 'n'}|${p.weight ?? 'n'}|${p.sex ?? 'n'}`
}

watch(
  () => [settings.state.calorieFormula, settings.state.maxHrFormula],
  () => {
    for (const k of Object.keys(cumulativeKcalByPid)) {
      delete cumulativeKcalByPid[k]
      delete cacheBodyKey[k]
    }
  },
)

watch(
  () => store.participants.map((p) => p.id),
  (ids) => {
    const alive = new Set(ids)
    for (const k of Object.keys(cumulativeKcalByPid)) {
      if (!alive.has(k)) {
        delete cumulativeKcalByPid[k]
        delete cacheBodyKey[k]
      }
    }
  },
)

function ensureCumulativeKcal(
  pid: string,
  participant: Participant | undefined,
  series: number[],
  statuses?: number[],
): number[] {
  if (!participant) return []
  const bk = bodyKeyOf(participant)
  if (cacheBodyKey[pid] !== bk) {
    // Body data (yob/weight/sex) changed — rebuild from scratch.
    delete cumulativeKcalByPid[pid]
    cacheBodyKey[pid] = bk
  }
  let cum = cumulativeKcalByPid[pid]
  if (!cum) {
    cum = []
    cumulativeKcalByPid[pid] = cum
  }
  if (cum.length > series.length) {
    // Series shrank (e.g. reset / restart) — rebuild from scratch.
    cum.length = 0
  }
  for (let i = cum.length; i < series.length; i++) {
    const prev = i > 0 ? cum[i - 1] : 0
    // Real measurements use the true bpm; silent/disconnect seconds fall
    // back to a light-cardio assumption so calories still accumulate while
    // the user is training without a working sensor. We use the unrounded
    // per-minute rate (then scale by 1 s) so each tick contributes a real
    // sub-kcal float — `kcalForBpm({durationSeconds:1})` would round each
    // delta to 0 and the cumulative chart would never move.
    const measured = !statuses || isMeasured(statuses[i])
    const bpm = measured ? series[i] : SILENT_BPM_ASSUMED
    const ratePerMin = kcalRatePerMinute({
      bpm,
      yob: participant.yob,
      weight: participant.weight,
      sex: participant.sex,
      formula: settings.state.calorieFormula,
      maxHrFormula: settings.state.maxHrFormula,
    })
    cum[i] = prev + ratePerMin / 60
  }
  return cum
}

function kcalHistoryFor(pid: string): number[] {
  const series = session.value?.bpmSeries[pid] ?? []
  if (!series.length) return []
  const p = store.participants.find((x) => x.id === pid)
  if (!p) return []
  const statuses = session.value?.bpmStatus?.[pid]
  const cum = ensureCumulativeKcal(pid, p, series, statuses)
  return cum.slice(-settings.state.chartWindowSeconds)
}

const avgGroupBpm = computed(() => {
  const s = session.value
  if (!s) return 0
  // Take the most recent non-gap reading per participant (live or virtual).
  // A participant whose latest tick is a real disconnect (0 / GAP) doesn't
  // pull the group average down.
  const vals: number[] = []
  for (const pid of s.participantIds) {
    const series = s.bpmSeries[pid]
    const statuses = s.bpmStatus?.[pid]
    if (!series?.length) continue
    const last = series.length - 1
    const lastStatus = statuses?.[last] ?? 0
    if (lastStatus === SAMPLE_GAP) continue
    if (series[last] > 0) vals.push(series[last])
  }
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
})

const totalKcal = computed(() => participants.value.reduce((acc, p) => acc + stats(p.id).kcal, 0))

const groupChartData = computed(() => {
  const s = session.value
  if (!s) {
    return {
      groupBpm: [] as number[],
      groupKcal: [] as number[],
      participantsData: [] as Array<{
        id: string
        name: string
        color: string
        yob: number | null
        bpmSeries: number[]
        bpmStatus: number[]
        kcalCumulative: number[]
      }>,
    }
  }
  const rows = s.participantIds.map((pid) => {
    const p = store.participants.find((x) => x.id === pid)
    const series = s.bpmSeries[pid] ?? []
    const statuses = s.bpmStatus?.[pid] ?? []
    const cum = ensureCumulativeKcal(pid, p, series, statuses)
    return {
      pid,
      participant: p,
      color: p?.color ?? '#ffffff',
      name: p?.name ?? t('workoutCard.fallbackName'),
      series,
      statuses,
      cum,
    }
  })
  const T = rows.reduce((m, r) => Math.max(m, r.series.length), 0)
  const groupBpm: number[] = new Array(T)
  const groupKcal: number[] = new Array(T)
  let cumulativeGroup = 0
  for (let i = 0; i < T; i++) {
    let sum = 0
    let count = 0
    let kcalDeltaAtI = 0
    for (const row of rows) {
      const v = row.series[i]
      const st = row.statuses[i] ?? 0
      // Live AND virtual (stale) readings both contribute to the group line —
      // a held-over bpm is still our best guess of where the participant is.
      // Real disconnects (gap = 0) are skipped so they don't drag the avg.
      if (typeof v === 'number' && v > 0 && st !== SAMPLE_GAP) {
        sum += v
        count++
      }
      const prev = i > 0 ? (row.cum[i - 1] ?? 0) : 0
      const cur = row.cum[i] ?? prev
      kcalDeltaAtI += cur - prev
    }
    // No live or virtual contributors at this tick (everyone disconnected /
    // never started): carry the previous group bpm forward instead of dropping
    // the chart to 0.
    groupBpm[i] = count ? Math.round(sum / count) : i > 0 ? groupBpm[i - 1] : 0
    cumulativeGroup += kcalDeltaAtI
    groupKcal[i] = cumulativeGroup
  }
  return {
    groupBpm,
    groupKcal,
    participantsData: rows.map((r) => ({
      id: r.pid,
      name: r.name,
      color: r.color,
      yob: r.participant?.yob ?? null,
      bpmSeries: r.series,
      bpmStatus: r.statuses,
      kcalCumulative: r.cum,
    })),
  }
})

const avgYob = computed<number | null>(() => {
  const yobs = participants.value
    .map((p) => p.yob)
    .filter((y): y is number => typeof y === 'number')
  if (!yobs.length) return null
  return Math.round(yobs.reduce((a, b) => a + b, 0) / yobs.length)
})

const spotlight = computed(() =>
  spotlightId.value ? (participants.value.find((p) => p.id === spotlightId.value) ?? null) : null,
)
const others = computed(() =>
  spotlight.value ? participants.value.filter((p) => p.id !== spotlight.value?.id) : [],
)

const coachMessages = computed(() => {
  const msgs: Array<{ id: string; kind: 'info' | 'warn' | 'good'; text: string; time: string }> = []
  const ts = formatTimer(elapsed.value)
  if (avgGroupBpm.value > 0) {
    msgs.push({
      id: 'avg',
      kind: 'info',
      text: t('coach.avgGroup', { bpm: avgGroupBpm.value }),
      time: ts,
    })
  }
  for (const p of participants.value) {
    if (isStale(p.id) && p.ble.length > 0) {
      msgs.push({
        id: 'stale-' + p.id,
        kind: 'warn',
        text: t('coach.staleDevice', { name: p.name }),
        time: ts,
      })
    }
  }
  return msgs.slice(-5)
})

function openFinish() {
  ui.openModal({ kind: 'finish_workout' })
}

function openAdd() {
  ui.openModal({ kind: 'add_to_workout' })
}

function beforeUnload(e: BeforeUnloadEvent) {
  if (store.isActive) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  void ble.autoReconnectAll()
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  unsubscribeBpm()
})
</script>

<template>
  <div class="dark-stage workout-stage">
    <template v-if="session">
      <WorkoutHeader
        :elapsed-seconds="elapsed"
        :count="participants.length"
        @add="openAdd"
        @finish="openFinish"
      />

      <div class="workout-body" :style="workoutBodyStyle">
        <GroupPulse
          :avg-bpm="avgGroupBpm"
          :avg-yob="avgYob"
          :count="participants.length"
          :total-kcal="totalKcal"
          :group-bpm-series="groupChartData.groupBpm"
          :group-kcal-series="groupChartData.groupKcal"
          :participants-data="groupChartData.participantsData"
          :started-at="session.startedAt"
        />

        <template v-if="spotlight">
          <div class="spotlight-layout">
            <div class="spotlight-main">
              <button class="card-action spot-close" @click="spotlightId = null">
                <Icon name="collapse" :size="14" /> {{ t('coach.spotlightClose') }}
              </button>
              <WorkoutCard
                :p="spotlight"
                :bpm="liveBpm(spotlight.id)"
                :history="historyFor(spotlight.id)"
                :history-status="historyStatusFor(spotlight.id)"
                :kcal-history="kcalHistoryFor(spotlight.id)"
                :stale="isStale(spotlight.id)"
                :lost="isLost(spotlight.id)"
                :kcal="stats(spotlight.id).kcal"
                :avg-bpm="stats(spotlight.id).avg"
                :min-bpm="stats(spotlight.id).min"
                :max-bpm="stats(spotlight.id).max"
                :elapsed-seconds="elapsed"
                :started-at="session.startedAt"
                layout="spotlight"
                @reconnect="reconnectParticipant(spotlight.id)"
              />
            </div>
            <div class="spotlight-rail">
              <WorkoutCard
                v-for="p in others"
                :key="p.id"
                :p="p"
                :bpm="liveBpm(p.id)"
                :history="historyFor(p.id)"
                :history-status="historyStatusFor(p.id)"
                :kcal-history="kcalHistoryFor(p.id)"
                :stale="isStale(p.id)"
                :lost="isLost(p.id)"
                :kcal="stats(p.id).kcal"
                :avg-bpm="stats(p.id).avg"
                :min-bpm="stats(p.id).min"
                :max-bpm="stats(p.id).max"
                :elapsed-seconds="elapsed"
                :started-at="session.startedAt"
                @spotlight="spotlightId = p.id"
                @reconnect="reconnectParticipant(p.id)"
              />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="participant-grid" :data-count="participants.length">
            <WorkoutCard
              v-for="p in participants"
              :key="p.id"
              :p="p"
              :bpm="liveBpm(p.id)"
              :history="historyFor(p.id)"
              :history-status="historyStatusFor(p.id)"
              :kcal-history="kcalHistoryFor(p.id)"
              :stale="isStale(p.id)"
              :lost="isLost(p.id)"
              :solo="participants.length === 1"
              :kcal="stats(p.id).kcal"
              :avg-bpm="stats(p.id).avg"
              :min-bpm="stats(p.id).min"
              :max-bpm="stats(p.id).max"
              :elapsed-seconds="elapsed"
              :started-at="session.startedAt"
              @spotlight="spotlightId = p.id"
              @reconnect="reconnectParticipant(p.id)"
            />
          </div>
        </template>
      </div>

      <CoachStrip :messages="coachMessages" />
      <ZoneLegend />
    </template>

    <template v-else>
      <div class="grid place-items-center h-screen">
        <div class="text-center">
          <h2 class="t-h2 text-[var(--d-text)]">{{ t('summaryView.notFound') }}</h2>
          <button class="btn btn-cta mt-5" @click="router.push({ name: 'home' })">
            {{ t('summary.back') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
