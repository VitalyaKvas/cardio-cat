import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { bootstrapLocale } from './composables/useLocale'
import { bootstrapTheme } from './composables/useTheme'
import { useWorkoutStorage } from './composables/useWorkoutStorage'
import { BOOT_CACHE_KEYS } from './constants/storage'
import { i18n } from './i18n'
import { registerECharts } from './lib/echarts'
import router from './router'
import { useSettingsStore } from './stores/settings'
import { useWorkoutStore } from './stores/workout'

import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './assets/style.css'

function bootstrapFirstRunRoute() {
  if (typeof window === 'undefined') return
  try {
    const seen = localStorage.getItem(BOOT_CACHE_KEYS.welcomeSeen) === '1'
    const path = window.location.pathname
    if (!seen && (path === '/' || path === '')) {
      window.history.replaceState({}, '', '/welcome')
    }
  } catch {
    // localStorage unavailable (private mode etc.) — skip onboarding redirect
  }
}

async function bootstrap() {
  bootstrapTheme()
  bootstrapLocale()
  bootstrapFirstRunRoute()
  registerECharts()

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(i18n)
  app.use(router)

  const storage = useWorkoutStorage()
  try {
    await storage.init()
    const workout = useWorkoutStore()
    const settings = useSettingsStore()
    await Promise.all([workout.restore(), settings.restore()])
  } catch (err) {
    console.error('Storage init failed:', err)
  }

  app.mount('#app')
}

bootstrap()
