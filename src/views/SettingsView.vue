<script setup lang="ts">
import Chip from '@/components/ui/Chip.vue'
import Icon from '@/components/ui/Icon.vue'
import SegControl from '@/components/ui/SegControl.vue'
import Toggle from '@/components/ui/Toggle.vue'
import { useAudio } from '@/composables/useAudio'
import { isGetDevicesSupported, isWebBluetoothSupported } from '@/composables/useHeartRateBle'
import { useLocale } from '@/composables/useLocale'
import type { ThemeMode } from '@/composables/useTheme'
import type { Locale } from '@/i18n'
import { BRAND_ACCENT } from '@/lib/color'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const settings = useSettingsStore()
const store = useWorkoutStore()
const ui = useUiStore()
const audio = useAudio()
const { t } = useI18n()
const { locale, supported } = useLocale()

const themeOptions = computed(() => [
  { value: 'light' as const, label: t('settings.themeLight') },
  { value: 'dark' as const, label: t('settings.themeDark') },
])

const themeValue = computed<ThemeMode>({
  get: () => settings.state.theme,
  set: (v) => {
    settings.state.theme = v
  },
})

const localeValue = computed<Locale>({
  get: () => locale.value,
  set: (v) => {
    locale.value = v
  },
})

const localeOptions = computed(() =>
  supported.map((code) => ({ value: code, label: t(`lang.${code}`) })),
)

const maxHrOptions = computed(() => [
  { value: 'classic' as const, label: '220 − ' + t('detail.age') },
  { value: 'tanaka' as const, label: 'Tanaka' },
  { value: 'gulati' as const, label: 'Gulati' },
])

const kcalOptions = [
  { value: 'keytel' as const, label: 'Keytel' },
  { value: 'simple' as const, label: 'Simple' },
  { value: 'met' as const, label: 'MET' },
]

const chartWindowOptions = computed(() => [
  { value: 60, label: `60 ${t('common.sec')}` },
  { value: 120, label: `120 ${t('common.sec')}` },
  { value: 180, label: `180 ${t('common.sec')}` },
])

const staleOptions = computed(() => [
  { value: 5000, label: `5 ${t('common.sec')}` },
  { value: 10000, label: `10 ${t('common.sec')}` },
  { value: 20000, label: `20 ${t('common.sec')}` },
])

const accentColors = [BRAND_ACCENT, '#5856de', '#00b33f', '#00a9dd', '#ff3d8a']

const appVersion = __APP_VERSION__

const fileInput = ref<HTMLInputElement | null>(null)

function exportJson() {
  const payload = store.exportJson()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const today = new Date().toISOString().slice(0, 10)
  a.download = `cardio-cat-backup-${today}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ui.pushToast('success', t('toast.exportSuccess'))
}

function triggerImport() {
  fileInput.value?.click()
}

function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result ?? '')
    ui.openModal({ kind: 'import_replace', payload: text })
    input.value = ''
  }
  reader.readAsText(file)
}

function testSound() {
  audio.testSound()
}

function showAutoReconnectHelp() {
  ui.openModal({
    kind: 'info_help',
    tone: 'warn',
    title: t('settings.autoReconnect'),
    body: t('settings.autoReconnectHelpBody'),
    code: 'chrome://flags/#enable-web-bluetooth-new-permissions-backend',
  })
}
</script>

<template>
  <div class="page">
    <div class="shell" style="padding-top: 32px; padding-bottom: 80px; max-width: 880px">
      <div class="t-eyebrow">{{ t('settings.eyebrow') }}</div>
      <h1 class="t-h1" style="margin: 8px 0 32px">{{ t('settings.title') }}</h1>

      <div class="card" style="padding: 8px; margin-bottom: 16px">
        <div style="padding: 16px 20px 8px">
          <div class="t-eyebrow">{{ t('settings.appearance') }}</div>
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.theme') }}</div>
            <div class="t-caption" style="margin-top: 2px">{{ t('settings.themeHint') }}</div>
          </div>
          <SegControl v-model="themeValue" :options="themeOptions" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.language') }}</div>
            <div class="t-caption" style="margin-top: 2px">{{ t('settings.languageHint') }}</div>
          </div>
          <SegControl v-model="localeValue" :options="localeOptions" />
        </div>
        <div class="set-row" style="padding-top: 0">
          <div class="ai-notice">
            <Icon name="sparkle" :size="14" color="var(--accent)" />
            <span>{{ t('settings.aiNotice') }}</span>
          </div>
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.accent') }}</div>
            <div class="t-caption" style="margin-top: 2px">{{ t('settings.accentHint') }}</div>
          </div>
          <div class="color-row">
            <button
              v-for="c in accentColors"
              :key="c"
              class="color-swatch"
              :class="{ 'is-active': c === settings.state.accentColor }"
              :style="{ '--sw': c } as Record<string, string>"
              @click="settings.state.accentColor = c"
            />
          </div>
        </div>
      </div>

      <div class="card" style="padding: 8px; margin-bottom: 16px">
        <div style="padding: 16px 20px 8px">
          <div class="t-eyebrow">{{ t('settings.sounds') }}</div>
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.soundStart') }}</div>
          </div>
          <Toggle v-model="settings.state.sounds.start" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.soundFinish') }}</div>
          </div>
          <Toggle v-model="settings.state.sounds.finish" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.soundStale') }}</div>
          </div>
          <Toggle v-model="settings.state.sounds.stale" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.soundZone5') }}</div>
          </div>
          <Toggle v-model="settings.state.sounds.zone5" />
        </div>
        <div class="set-row">
          <div style="flex: 1" />
          <button class="btn btn-soft" @click="testSound">
            <Icon name="volume" :size="14" /> {{ t('settings.testSound') }}
          </button>
        </div>
      </div>

      <div class="card" style="padding: 8px; margin-bottom: 16px">
        <div style="padding: 16px 20px 8px">
          <div class="t-eyebrow">{{ t('settings.training') }}</div>
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.maxHrFormula') }}</div>
            <div class="t-caption">{{ t('settings.maxHrHint') }}</div>
          </div>
          <SegControl v-model="settings.state.maxHrFormula" :options="maxHrOptions" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.kcalFormula') }}</div>
            <div class="t-caption">{{ t('settings.kcalHint') }}</div>
          </div>
          <SegControl v-model="settings.state.calorieFormula" :options="kcalOptions" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.chartWindow') }}</div>
            <div class="t-caption">{{ t('settings.chartWindowHint') }}</div>
          </div>
          <SegControl v-model="settings.state.chartWindowSeconds" :options="chartWindowOptions" />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.staleThreshold') }}</div>
            <div class="t-caption">{{ t('settings.staleHint') }}</div>
          </div>
          <SegControl v-model="settings.state.staleMs" :options="staleOptions" />
        </div>
      </div>

      <div class="card" style="padding: 8px; margin-bottom: 16px">
        <div style="padding: 16px 20px 8px">
          <div class="t-eyebrow">{{ t('settings.data') }}</div>
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.export') }}</div>
            <div class="t-caption">{{ t('settings.exportHint') }}</div>
          </div>
          <button class="btn btn-soft" @click="exportJson">
            <Icon name="download" :size="14" /> {{ t('settings.exportBtn') }}
          </button>
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.import') }}</div>
            <div class="t-caption">{{ t('settings.importHint') }}</div>
          </div>
          <button class="btn btn-soft" @click="triggerImport">
            <Icon name="upload" :size="14" /> {{ t('settings.importBtn') }}
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="application/json"
            style="display: none"
            @change="handleFile"
          />
        </div>
        <div class="set-row">
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 15px">{{ t('settings.clear') }}</div>
            <div class="t-caption">{{ t('settings.clearHint') }}</div>
          </div>
          <button class="btn btn-danger" @click="ui.openModal({ kind: 'clear_all' })">
            <Icon name="trash" :size="14" /> {{ t('settings.clearBtn') }}
          </button>
        </div>
      </div>

      <div class="card" style="padding: 8px">
        <div style="padding: 16px 20px 8px">
          <div class="t-eyebrow">{{ t('settings.about') }}</div>
        </div>
        <div class="set-row">
          <div style="flex: 1; font-weight: 600">{{ t('settings.version') }}</div>
          <span class="t-mono">v{{ appVersion }}</span>
        </div>
        <div class="set-row">
          <div style="flex: 1; font-weight: 600">{{ t('settings.webBluetooth') }}</div>
          <Chip v-if="isWebBluetoothSupported()" variant="success">
            <Icon name="check" :size="12" /> {{ t('settings.supported') }}
          </Chip>
          <Chip v-else> <Icon name="alert" :size="12" /> {{ t('settings.notSupported') }} </Chip>
        </div>
        <div class="set-row">
          <div style="flex: 1; font-weight: 600; display: flex; align-items: center; gap: 8px">
            <span>{{ t('settings.autoReconnect') }}</span>
            <button
              v-if="!isGetDevicesSupported()"
              type="button"
              class="help-tip"
              :title="t('settings.autoReconnectHelp')"
              :aria-label="t('settings.autoReconnectHelp')"
              @click="showAutoReconnectHelp"
            >
              <Icon name="info" :size="18" />
            </button>
          </div>
          <Chip v-if="isGetDevicesSupported()" variant="success">
            <Icon name="check" :size="12" /> {{ t('settings.available') }}
          </Chip>
          <Chip v-else> <Icon name="alert" :size="12" /> {{ t('settings.notAvailable') }} </Chip>
        </div>
      </div>
    </div>
  </div>
</template>
