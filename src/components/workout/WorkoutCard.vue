<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import BeatingHeart from '@/components/workout/BeatingHeart.vue'
import EcgChart from '@/components/workout/EcgChart.vue'
import ZoneRibbon from '@/components/workout/ZoneRibbon.vue'
import { useSettingsStore } from '@/stores/settings'
import { ageFromYob, maxHr, zoneAt } from '@/lib/zones'
import type { Participant } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    p: Participant
    bpm: number | null
    history: number[]
    historyStatus?: number[]
    kcalHistory: number[]
    layout?: 'default' | 'spotlight'
    kcal: number
    avgBpm: number
    minBpm: number | null
    maxBpm: number | null
    stale?: boolean
    lost?: boolean
    solo?: boolean
    elapsedSeconds?: number
    startedAt: number
  }>(),
  {
    layout: 'default',
    stale: false,
    lost: false,
    solo: false,
    elapsedSeconds: 0,
    historyStatus: () => [],
  },
)

const emit = defineEmits<{
  (e: 'spotlight'): void
  (e: 'reconnect'): void
}>()

const settings = useSettingsStore()

const age = computed(() => ageFromYob(props.p.yob))
const maxHrLabel = computed(() => maxHr(props.p.yob, settings.state.maxHrFormula))
const safeBpm = computed(() => props.bpm ?? 0)
const zone = computed(() => zoneAt(safeBpm.value, props.p.yob, settings.state.maxHrFormula))

const cardStyle = computed(
  () =>
    ({
      '--c-accent': props.p.color,
      '--zone-c': zone.value.color,
    }) as Record<string, string>,
)
</script>

<template>
  <div
    class="wo-card"
    :class="{ 'wo-card-spot': layout === 'spotlight', 'is-lost': lost }"
    :style="cardStyle"
  >
    <div class="wo-card-stripe" />

    <div v-if="lost" class="wo-card-warning">
      <Icon name="alert" :size="12" /> {{ t('workoutCard.connectionLost') }}
      <button
        type="button"
        class="wo-card-warning-btn"
        :title="t('workoutCard.reconnect')"
        @click.stop="emit('reconnect')"
      >
        <Icon name="refresh" :size="12" />
      </button>
    </div>

    <div class="wo-card-head">
      <Avatar :glyph="p.avatar" :color="p.color" size="sm" />
      <div style="flex: 1">
        <div style="font-family: var(--f-display); font-weight: 700; font-size: 18px">
          {{ p.name }}
        </div>
        <div style="font-size: 11px; color: var(--d-text-3); margin-top: 2px">
          {{ t('workoutCard.ageMax', { age, maxHr: maxHrLabel }) }}
        </div>
      </div>
      <button
        v-if="p.ble.length > 0"
        class="card-action"
        :title="t('workoutCard.refresh')"
        @click.stop="emit('reconnect')"
      >
        <Icon name="refresh" :size="14" />
      </button>
      <button
        v-if="layout !== 'spotlight' && !solo"
        class="card-action"
        :title="t('workoutCard.spotlight')"
        @click="emit('spotlight')"
      >
        <Icon name="expand" :size="14" />
      </button>
    </div>

    <div class="wo-card-readout">
      <BeatingHeart
        :bpm="safeBpm"
        :color="zone.color"
        :stale="stale"
        :intense="zone.z === 5"
        :size="layout === 'spotlight' ? 'lg' : 'md'"
      />
      <div class="bpm-display">
        <span
          class="bpm-num t-mono"
          :style="{ color: stale ? 'var(--d-text-3)' : 'var(--d-text)' }"
        >
          {{ stale || bpm == null ? '—' : bpm }}
        </span>
        <span class="bpm-unit">bpm</span>
      </div>
    </div>

    <ZoneRibbon :bpm="safeBpm" :yob="p.yob" />

    <div class="wo-chart">
      <EcgChart
        :history="history"
        :history-status="historyStatus"
        :kcal-history="kcalHistory"
        :color="p.color"
        :max-hr="maxHrLabel"
        :yob="p.yob"
        :elapsed-seconds="elapsedSeconds"
        :started-at="startedAt"
      />
    </div>

    <div class="wo-card-foot">
      <div class="foot-stat">
        <div class="foot-stat-label">
          <Icon name="flame" :size="10" color="var(--accent)" /> {{ t('workout.kcalShort') }}
        </div>
        <div class="t-mono foot-stat-value" style="color: var(--accent)">~{{ kcal }}</div>
      </div>
      <div class="foot-stat">
        <div class="foot-stat-label">avg</div>
        <div class="t-mono foot-stat-value">{{ avgBpm || '—' }}</div>
      </div>
      <div class="foot-stat">
        <div class="foot-stat-label">min</div>
        <div class="t-mono foot-stat-value">{{ minBpm ?? '—' }}</div>
      </div>
      <div class="foot-stat">
        <div class="foot-stat-label">max</div>
        <div class="t-mono foot-stat-value">{{ maxBpm ?? '—' }}</div>
      </div>
    </div>
  </div>
</template>
