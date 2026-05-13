<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import { useParticipantBle } from '@/composables/useParticipantBle'
import { formatMinutes } from '@/lib/time'
import { ageFromYob, maxHr } from '@/lib/zones'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore, type Participant } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{
  p: Participant
  selected: boolean
}>()

const emit = defineEmits<{ (e: 'toggle'): void }>()

const ble = useParticipantBle()
const ui = useUiStore()
const router = useRouter()
const store = useWorkoutStore()
const { t } = useI18n()

const age = computed(() => ageFromYob(props.p.yob))
const maxHrLabel = computed(() => maxHr(props.p.yob))

const primaryDevice = computed(() => props.p.ble[0] ?? null)

const liveBpm = computed(() => {
  const d = primaryDevice.value
  if (!d) return null
  if (ble.isStale(props.p.id, d.id)) return null
  return ble.getLiveBpm(props.p.id, d.id)
})

const lastSession = computed(() => {
  for (const s of store.orderedSessions) {
    if (s.participantIds.includes(props.p.id)) return s
  }
  return null
})

const lastSessionLabel = computed(() => {
  const s = lastSession.value
  if (!s?.endedAt) return null
  const min = Math.round((s.endedAt - s.startedAt) / 60000)
  return formatMinutes(min * 60)
})

function openDetails(e: Event) {
  e.stopPropagation()
  router.push({ name: 'participant-detail', params: { id: props.p.id } })
}

function openHide(e: Event) {
  e.stopPropagation()
  ui.openModal({ kind: 'hide_participant', id: props.p.id })
}

function connect(e: Event) {
  e.stopPropagation()
  ble.addBleDevice(props.p.id)
}

function reconnect(e: Event) {
  e.stopPropagation()
  if (primaryDevice.value) ble.reconnectDevice(props.p.id, primaryDevice.value.id)
}

function unlinkDevice(e: Event) {
  e.stopPropagation()
  const d = primaryDevice.value
  if (!d) return
  ble.removeBleDevice(props.p.id, d.id)
  ui.pushToast(
    'info',
    t('participant.disconnectedToast', { name: d.name || t('participant.deviceFallback') }),
  )
}
</script>

<template>
  <div
    class="p-card"
    :class="{ 'is-selected': selected }"
    :style="{ '--c-accent': p.color } as Record<string, string>"
    role="button"
    tabindex="0"
    @click="emit('toggle')"
    @keydown.enter="emit('toggle')"
  >
    <div class="p-card-stripe" />

    <div class="p-card-head">
      <Avatar :glyph="p.avatar" :color="p.color" size="lg" />
      <div class="p-card-name">
        <div class="t-display" style="font-size: 22px">{{ p.name }}</div>
        <div class="t-caption" style="margin-top: 4px">
          {{ t('participant.ageMaxHr', { age, maxHr: maxHrLabel }) }}
        </div>
      </div>
      <div class="check">
        <Icon v-if="selected" name="check" :size="14" color="white" />
      </div>
    </div>

    <div class="p-card-device">
      <template v-if="primaryDevice">
        <div class="row">
          <Icon name="bluetooth" :size="14" color="var(--c-text-3)" />
          <span style="font-size: 13px; font-weight: 600">
            {{ primaryDevice.name || t('participant.deviceFallback') }}
          </span>
        </div>
        <div class="device-bpm">
          <span
            class="device-bpm-dot"
            :style="{ background: liveBpm == null ? 'var(--c-amber)' : 'var(--c-green)' }"
          />
          <template v-if="liveBpm != null">
            <span class="t-mono" style="font-weight: 700">{{ liveBpm }}</span>
            <span class="t-caption" style="margin-left: 4px">bpm</span>
          </template>
          <template v-else>
            <span style="font-family: var(--f-mono); color: var(--c-text-3)">— bpm</span>
            <button
              class="btn btn-soft"
              style="padding: 6px 10px; font-size: 12px; margin-left: 8px"
              :title="t('participant.reconnect')"
              @click="reconnect"
            >
              <Icon name="refresh" :size="12" />
            </button>
          </template>
          <button
            class="icon-btn-sm"
            style="margin-left: 4px"
            :title="t('participant.unlinkDevice')"
            @click="unlinkDevice"
          >
            <Icon name="trash" :size="14" />
          </button>
        </div>
      </template>
      <template v-else>
        <span class="muted" style="font-size: 13px">{{ t('participant.noDevice') }}</span>
        <button class="btn btn-soft" style="padding: 8px 14px; font-size: 12px" @click="connect">
          <Icon name="bluetooth" :size="14" /> {{ t('participant.connect') }}
        </button>
      </template>
    </div>

    <div v-if="lastSessionLabel" class="p-card-foot">
      <div>
        <div class="t-caption">{{ t('participant.lastSession') }}</div>
        <div style="font-size: 13px; font-weight: 600; margin-top: 2px">
          {{ lastSessionLabel }}
        </div>
      </div>
    </div>

    <div class="p-card-actions">
      <button class="btn btn-ghost" style="padding: 8px 14px; font-size: 13px" @click="openDetails">
        {{ t('participant.details') }} <Icon name="chevron-right" :size="14" />
      </button>
      <button class="icon-btn-sm" :title="t('participant.hideTrash')" @click="openHide">
        <Icon name="trash" :size="16" />
      </button>
    </div>
  </div>
</template>
