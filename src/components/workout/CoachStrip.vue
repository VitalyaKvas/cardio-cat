<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  messages: Array<{
    id: number | string
    kind: 'info' | 'warn' | 'good'
    text: string
    time: string
  }>
}>()
</script>

<template>
  <div class="coach-strip">
    <div class="coach-head">
      <Icon name="sparkle" :size="16" color="var(--accent)" />
      <span style="font-weight: 600; font-size: 13px">Co-Coach</span>
      <span class="t-caption" style="color: var(--d-text-3); margin-left: 4px">
        {{ t('coach.hint') }}
      </span>
    </div>
    <div class="coach-feed">
      <div v-if="messages.length === 0" class="t-caption" style="color: var(--d-text-3)">
        {{ t('coach.waiting') }}
      </div>
      <div v-for="m in messages" :key="m.id" class="coach-msg" :class="m.kind">
        <span class="coach-time t-mono">{{ m.time }}</span>
        <span class="coach-dot" />
        <span>{{ m.text }}</span>
      </div>
    </div>
  </div>
</template>
