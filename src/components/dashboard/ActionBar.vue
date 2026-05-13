<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useAudio } from '@/composables/useAudio'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{
  selected: string[]
}>()

const emit = defineEmits<{
  (e: 'select-all', value: boolean): void
}>()

const store = useWorkoutStore()
const ui = useUiStore()
const router = useRouter()
const audio = useAudio()
const { t } = useI18n()

const allSelected = computed(
  () =>
    store.visibleParticipants.length > 0 &&
    props.selected.length === store.visibleParticipants.length,
)

function start() {
  if (props.selected.length === 0) return
  const id = store.startSession(props.selected)
  audio.playStart()
  ui.pushToast('success', t('actionBarT.startedToast'))
  router.push({ name: 'workout-session', params: { sessionId: id } })
}
</script>

<template>
  <div class="action-bar">
    <div class="row" style="gap: 16px">
      <div class="selected-count">
        <span class="t-mono" style="font-size: 24px; font-weight: 700">{{ selected.length }}</span>
        <span style="color: var(--c-text-3); font-size: 13px; margin-left: 6px">
          {{ t('dashboard.selectedOf', { total: store.visibleParticipants.length }) }}
        </span>
      </div>
      <button class="btn btn-ghost" @click="emit('select-all', !allSelected)">
        {{ allSelected ? t('dashboard.deselectAll') : t('dashboard.selectAll') }}
      </button>
    </div>

    <div class="row" style="gap: 10px">
      <button class="btn btn-soft" @click="ui.openModal({ kind: 'new_participant' })">
        <Icon name="user-plus" :size="16" />
        {{ t('dashboard.addParticipant') }}
      </button>
      <button class="btn btn-cta btn-lg" :aria-disabled="selected.length === 0" @click="start">
        <Icon name="play" :size="16" />
        {{ t('dashboard.startWorkout') }}
        <span v-if="selected.length > 0" class="cta-pill">{{ selected.length }}</span>
      </button>
    </div>
  </div>
</template>
