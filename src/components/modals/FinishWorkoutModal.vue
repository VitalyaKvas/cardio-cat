<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import ModalShell from '@/components/modals/ModalShell.vue'
import { useAudio } from '@/composables/useAudio'
import { useIntervalFn } from '@/composables/useIntervalFn'
import { formatTimer } from '@/lib/time'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const emit = defineEmits<{ (e: 'close'): void }>()

const store = useWorkoutStore()
const ui = useUiStore()
const router = useRouter()
const audio = useAudio()
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

const isShort = computed(() => elapsed.value < 60)
const timer = computed(() => formatTimer(elapsed.value))
const participantCount = computed(() => store.currentSession?.participantIds.length ?? 0)

function finishSave() {
  const id = store.finishSession(true)
  audio.playFinish()
  ui.pushToast('success', t('finishWorkoutT.savedToast'))
  emit('close')
  if (id) router.push({ name: 'workout-summary', params: { sessionId: id } })
  else router.push({ name: 'home' })
}

function finishDiscard() {
  store.finishSession(false)
  ui.pushToast('info', t('finishWorkoutT.discardToast'))
  emit('close')
  router.push({ name: 'home' })
}
</script>

<template>
  <ModalShell
    :title="isShort ? t('finishWorkout.shortTitle') : t('finishWorkout.longTitle')"
    @close="emit('close')"
  >
    <template v-if="isShort">
      <p style="margin: 0">
        {{ t('finishWorkout.shortQuestion') }}
        <span class="t-mono">{{ timer }}</span>
      </p>
    </template>
    <template v-else>
      <div class="finish-summary">
        <div>
          <div class="t-eyebrow">{{ t('finishWorkout.duration') }}</div>
          <div class="t-mono finish-big">{{ timer }}</div>
        </div>
        <div>
          <div class="t-eyebrow">{{ t('finishWorkout.participants') }}</div>
          <div class="t-mono finish-big">{{ participantCount }}</div>
        </div>
        <div>
          <div class="t-eyebrow">{{ t('finishWorkout.data') }}</div>
          <div class="t-mono finish-big">{{ t('finishWorkout.dataSaved') }}</div>
        </div>
      </div>
      <p class="t-caption" style="margin-top: 8px">
        {{ t('finishWorkout.soundHint') }}
      </p>
    </template>

    <template #foot>
      <template v-if="isShort">
        <button class="btn btn-ghost" @click="finishDiscard">
          {{ t('finishWorkout.discard') }}
        </button>
        <button class="btn btn-cta" @click="finishSave">
          <Icon name="check" :size="14" /> {{ t('finishWorkout.keepSave') }}
        </button>
      </template>
      <template v-else>
        <button class="btn btn-ghost" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button class="btn btn-danger" @click="finishSave">
          <Icon name="stop" :size="14" /> {{ t('finishWorkout.stopFinish') }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>
