<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useLocale } from '@/composables/useLocale'
import type { Locale } from '@/i18n'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, supported, setLocale } = useLocale()
const { t } = useI18n()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const labels: Record<Locale, string> = {
  uk: 'UA',
  en: 'EN',
  crh: 'CRH',
}

const fullLabels: Record<Locale, string> = {
  uk: 'Українська',
  en: 'English',
  crh: 'Qırımtatarca',
}

function toggle() {
  open.value = !open.value
}

function pick(value: Locale) {
  setLocale(value)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (!root.value) return
  if (!root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div ref="root" class="lang-switcher">
    <button
      type="button"
      class="icon-btn lang-trigger"
      :aria-label="fullLabels[locale]"
      :title="fullLabels[locale]"
      @click="toggle"
    >
      {{ labels[locale] }}
    </button>
    <div v-if="open" class="lang-menu" role="menu">
      <button
        v-for="code in supported"
        :key="code"
        type="button"
        class="lang-menu-item"
        :class="{ 'is-active': code === locale }"
        @click="pick(code)"
      >
        <span class="lang-code">{{ labels[code] }}</span>
        <span class="lang-full">{{ fullLabels[code] }}</span>
      </button>
      <div class="lang-menu-footer" :title="t('settings.aiNotice')">
        <Icon name="sparkle" :size="12" color="var(--accent)" />
        <span>{{ t('settings.aiNoticeShort') }}</span>
      </div>
    </div>
  </div>
</template>
