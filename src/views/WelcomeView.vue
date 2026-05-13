<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useWorkoutStorage } from '@/composables/useWorkoutStorage'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()
const slide = ref(0)
const storage = useWorkoutStorage()

function next() {
  if (slide.value < 2) slide.value++
}

function back() {
  if (slide.value > 0) slide.value--
}

function finish() {
  storage.saveWelcomeSeen(true).catch(() => {})
  router.push({ name: 'home' })
}

const steps = computed(() => [
  { n: 1, title: t('welcome.step1Title'), icon: 'users', body: t('welcome.step1Body') },
  { n: 2, title: t('welcome.step2Title'), icon: 'bluetooth', body: t('welcome.step2Body') },
  { n: 3, title: t('welcome.step3Title'), icon: 'pulse', body: t('welcome.step3Body') },
])
</script>

<template>
  <div class="welcome">
    <button class="skip-btn" @click="finish">{{ t('welcome.skip') }}</button>

    <div v-if="slide === 0" class="slide">
      <div class="hero-heart">
        <div class="hero-rings">
          <span v-for="i in 4" :key="i" :style="{ animationDelay: `${i * 0.4}s` }" />
        </div>
        <div class="hero-heart-glyph">
          <Icon name="heart" :size="120" color="var(--accent)" fill="var(--accent)" />
        </div>
      </div>
      <h1 class="t-display" style="font-size: 88px; margin-top: 32px">
        {{ t('welcome.title') }}
      </h1>
      <p class="welcome-sub">
        {{ t('welcome.subtitleLine1') }}<br />
        {{ t('welcome.subtitleLine2') }}
      </p>
      <button class="btn btn-cta btn-lg" style="margin-top: 36px" @click="next">
        {{ t('welcome.next') }} <Icon name="arrow-right" :size="16" />
      </button>
    </div>

    <div v-else-if="slide === 1" class="slide">
      <div class="t-eyebrow">{{ t('welcome.workflowEyebrow') }}</div>
      <h1 class="t-h1" style="margin-top: 8px">{{ t('welcome.howItWorks') }}</h1>
      <div class="hiw-grid">
        <div v-for="s in steps" :key="s.n" class="hiw-card">
          <div class="hiw-num t-mono">{{ s.n }}</div>
          <div class="hiw-glyph">
            <Icon :name="s.icon" :size="32" color="var(--accent)" />
          </div>
          <h3 class="t-h3" style="margin: 0 0 8px">{{ s.title }}</h3>
          <p style="color: var(--c-text-3); margin: 0">{{ s.body }}</p>
        </div>
      </div>
      <div class="welcome-foot">
        <button class="btn btn-ghost" @click="back">
          <Icon name="arrow-left" :size="14" /> {{ t('welcome.back') }}
        </button>
        <button class="btn btn-cta" @click="next">
          {{ t('welcome.next') }} <Icon name="arrow-right" :size="14" />
        </button>
      </div>
    </div>

    <div v-else class="slide">
      <Icon name="lock" :size="48" color="var(--accent)" />
      <h1 class="t-h1" style="margin-top: 16px">{{ t('welcome.privacyTitle') }}</h1>
      <div class="privacy-list">
        <div class="privacy-row">
          <Icon name="check" :size="18" color="var(--c-green)" />
          {{ t('welcome.privacy1') }}
        </div>
        <div class="privacy-row">
          <Icon name="check" :size="18" color="var(--c-green)" />
          {{ t('welcome.privacy2') }}
        </div>
        <div class="privacy-row">
          <Icon name="check" :size="18" color="var(--c-green)" />
          {{ t('welcome.privacy3') }}
        </div>
        <div class="privacy-row warn">
          <Icon name="alert" :size="18" color="var(--c-amber)" />
          {{ t('welcome.privacyWarn') }}
        </div>
      </div>
      <button class="btn btn-cta btn-lg" style="margin-top: 36px" @click="finish">
        <Icon name="pulse" :size="16" /> {{ t('welcome.finalCta') }}
      </button>
      <div style="margin-top: 16px">
        <button class="btn btn-ghost" @click="back">
          <Icon name="arrow-left" :size="14" /> {{ t('welcome.back') }}
        </button>
      </div>
    </div>

    <div class="dots">
      <span v-for="i in 3" :key="i" class="dot" :class="{ 'is-active': i - 1 === slide }" />
    </div>
  </div>
</template>
