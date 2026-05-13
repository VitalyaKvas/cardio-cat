<script setup lang="ts">
import ActiveWorkoutBanner from '@/components/ActiveWorkoutBanner.vue'
import AppHeader from '@/components/AppHeader.vue'
import ModalHost from '@/components/ModalHost.vue'
import ToastStack from '@/components/ToastStack.vue'
import { useLocale } from '@/composables/useLocale'
import { useTheme } from '@/composables/useTheme'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutStore } from '@/stores/workout'
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

useTheme()
useLocale()

const route = useRoute()
const store = useWorkoutStore()
const settings = useSettingsStore()

// Live-bind the chosen accent color to the global --accent CSS variable so
// every button / icon / chip that uses var(--accent) updates instantly.
watch(
  () => settings.state.accentColor,
  (val) => {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--accent', val)
  },
  { immediate: true },
)

const isWorkoutFullscreen = computed(() => route.name === 'workout-session')
const isWelcome = computed(() => route.name === 'welcome')
const showBanner = computed(() => store.isActive && !isWorkoutFullscreen.value && !isWelcome.value)
</script>

<template>
  <AppHeader v-if="!isWorkoutFullscreen && !isWelcome" />
  <ActiveWorkoutBanner v-if="showBanner" />
  <RouterView />
  <ModalHost />
  <ToastStack />
</template>
