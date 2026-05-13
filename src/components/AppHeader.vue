<script setup lang="ts">
import BrandLogo from '@/components/BrandLogo.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import Icon from '@/components/ui/Icon.vue'
import { useTheme } from '@/composables/useTheme'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const store = useWorkoutStore()
const { theme, toggleTheme } = useTheme()
const { t } = useI18n()

const trashCount = computed(() => store.trashedParticipants.length)

type NavItem = { id: 'home' | 'settings'; labelKey: string; tab?: 'stats' }

const navItems: NavItem[] = [
  { id: 'home', labelKey: 'header.home' },
  { id: 'home', labelKey: 'header.stats', tab: 'stats' },
  { id: 'settings', labelKey: 'header.settings' },
]

function isActive(item: NavItem) {
  if (item.id !== route.name) return false
  if (item.tab) return route.query.tab === item.tab
  if (item.id === 'home') return !route.query.tab
  return true
}

function go(item: NavItem) {
  router.push({ name: item.id, query: item.tab ? { tab: item.tab } : {} })
}

const themeIcon = computed(() => (theme.value === 'dark' ? 'sun' : 'moon'))
const themeTitle = computed(() =>
  theme.value === 'dark' ? t('header.themeLight') : t('header.themeDark'),
)
</script>

<template>
  <div class="top-bar">
    <button class="brand" @click="router.push({ name: 'home' })">
      <BrandLogo :size="50" />
      <span>Cardio Cat</span>
    </button>

    <nav class="nav">
      <button
        v-for="item in navItems"
        :key="item.labelKey + (item.tab ?? '')"
        class="nav-item"
        :class="{ active: isActive(item) }"
        @click="go(item)"
      >
        {{ t(item.labelKey) }}
      </button>
    </nav>

    <div class="top-right">
      <LanguageSwitcher />
      <button class="icon-btn" :title="t('header.trash')" @click="router.push({ name: 'trash' })">
        <Icon name="trash" :size="18" />
        <span v-if="trashCount > 0" class="badge">{{ trashCount }}</span>
      </button>
      <button class="icon-btn" :title="themeTitle" @click="toggleTheme">
        <Icon :name="themeIcon" :size="18" />
      </button>
    </div>
  </div>
</template>
