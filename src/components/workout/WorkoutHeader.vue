<script setup lang="ts">
import BrandLogo from '@/components/BrandLogo.vue'
import Icon from '@/components/ui/Icon.vue'
import { formatTimer } from '@/lib/time'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'

defineProps<{
  elapsedSeconds: number
  count: number
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'finish'): void
}>()

const settings = useSettingsStore()
const { t } = useI18n()
const zoomOptions = [1, 2, 3, 3.5]
</script>

<template>
  <div class="workout-header">
    <div class="row" style="gap: 14px">
      <BrandLogo :size="64" />
      <div>
        <div
          style="
            font-family: var(--f-mono);
            font-size: 11px;
            color: var(--d-text-3);
            letter-spacing: 0.15em;
            text-transform: uppercase;
          "
        >
          <span
            class="live-dot"
            style="display: inline-block; margin-right: 8px; vertical-align: middle"
          />
          {{ t('workoutHeader.liveBrand') }}
        </div>
        <div style="font-family: var(--f-display); font-weight: 700; font-size: 18px">
          {{ t('workoutHeader.activeTraining') }}
        </div>
      </div>
    </div>

    <div class="workout-timer">
      <span class="t-mono">{{ formatTimer(elapsedSeconds) }}</span>
    </div>

    <div class="row" style="gap: 10px; justify-content: flex-end; flex-wrap: wrap">
      <div class="zoom-control" role="group" :aria-label="t('workoutHeader.zoom')">
        <button
          v-for="z in zoomOptions"
          :key="z"
          type="button"
          class="zoom-seg"
          :class="{ 'is-on': settings.state.workoutZoom === z }"
          @click="settings.state.workoutZoom = z"
        >
          {{ z }}×
        </button>
      </div>
      <div class="workout-count">
        <Icon name="users" :size="16" />
        <span style="font-weight: 600">{{ count }}</span>
      </div>
      <button
        class="btn btn-soft"
        style="background: var(--d-surface); color: var(--d-text)"
        @click="emit('add')"
      >
        <Icon name="user-plus" :size="16" /> {{ t('workoutHeader.participantBtn') }}
      </button>
      <button class="btn btn-cta" @click="emit('finish')">
        <Icon name="stop" :size="14" /> {{ t('workoutHeader.finishBtn') }}
      </button>
    </div>
  </div>
</template>
