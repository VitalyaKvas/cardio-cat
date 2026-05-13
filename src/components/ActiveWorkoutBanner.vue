<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useIntervalFn } from '@/composables/useIntervalFn'
import { formatTimer } from '@/lib/time'
import { useWorkoutStore } from '@/stores/workout'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const store = useWorkoutStore()
const router = useRouter()
const { t } = useI18n()
const now = ref(Date.now())

useIntervalFn(() => {
  now.value = Date.now()
}, 1000)

const elapsed = computed(() => {
  const s = store.currentSession
  if (!s) return 0
  return Math.floor((now.value - s.startedAt) / 1000)
})

const participantCount = computed(() => store.currentSession?.participantIds.length ?? 0)

function returnToWorkout() {
  const s = store.currentSession
  if (!s) return
  router.push({ name: 'workout-session', params: { sessionId: s.id } })
}
</script>

<template>
  <div class="workout-banner">
    <span class="live-dot" />
    <span
      style="font-family: var(--f-mono); font-weight: 600; letter-spacing: 0.1em; font-size: 12px"
    >
      {{ t('banner.ongoing') }}
    </span>
    <span style="color: var(--d-text-3)">·</span>
    <span style="font-family: var(--f-mono); font-variant-numeric: tabular-nums; font-size: 16px">
      {{ formatTimer(elapsed) }}
    </span>
    <span style="color: var(--d-text-3)">·</span>
    <span style="font-size: 14px; color: var(--d-text-2)">
      {{ t('banner.participants', { n: participantCount }) }}
    </span>
    <div class="spacer" />
    <button class="btn btn-cta" @click="returnToWorkout">
      <Icon name="arrow-right" :size="16" />
      {{ t('banner.return') }}
    </button>
  </div>
</template>
