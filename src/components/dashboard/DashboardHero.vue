<script setup lang="ts">
import { formatMinutes, todayHeader } from '@/lib/time'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useWorkoutStore()
const { t, locale } = useI18n()

const today = computed(() => {
  void locale.value
  return todayHeader()
})

const totalMinutes = computed(() => {
  let total = 0
  for (const s of store.orderedSessions) {
    if (s.endedAt) total += Math.round((s.endedAt - s.startedAt) / 60000)
  }
  return total
})

const sessionsThisWeek = computed(() => {
  const weekAgo = Date.now() - 7 * 86400000
  return store.orderedSessions.filter((s) => (s.endedAt ?? 0) >= weekAgo).length
})

const lastSession = computed(() => store.orderedSessions[0] ?? null)
const lastDurationMin = computed(() => {
  const s = lastSession.value
  if (!s?.endedAt) return null
  return Math.round((s.endedAt - s.startedAt) / 60000)
})
</script>

<template>
  <div class="dash-hero">
    <div class="shell" style="padding-top: 56px; padding-bottom: 8px">
      <div class="hero-row">
        <div>
          <div class="t-eyebrow" style="margin-bottom: 14px">
            <span style="display: inline-flex; align-items: center; gap: 8px">
              <span class="hero-dot" />
              {{ today }}
            </span>
          </div>
          <h1 class="t-hero">
            {{ t('hero.greetingPrefix') }}
            <span style="color: var(--accent)">{{ t('hero.role') }}</span
            >.<br />
            {{ t('hero.who') }}
          </h1>
          <p style="font-size: 18px; color: var(--c-text-2); max-width: 560px; margin-top: 18px">
            {{ t('hero.body') }}
          </p>
        </div>

        <div class="hero-stats">
          <div class="hero-stat" data-tone="tangerine">
            <div class="hero-stat-value t-mono">{{ sessionsThisWeek }}</div>
            <div class="hero-stat-label">{{ t('hero.sessionsWeek') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value t-mono">{{ totalMinutes }}</div>
            <div class="hero-stat-label">{{ t('hero.totalMinutes') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value t-mono">{{ store.visibleParticipants.length }}</div>
            <div class="hero-stat-label">{{ t('hero.participants') }}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value t-mono">
              {{ lastDurationMin != null ? lastDurationMin : '—' }}
            </div>
            <div class="hero-stat-label">{{ t('hero.lastSession') }}</div>
            <div v-if="lastDurationMin != null" class="hero-stat-sub">
              {{ formatMinutes((lastDurationMin ?? 0) * 60) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
