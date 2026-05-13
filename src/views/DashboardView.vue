<script setup lang="ts">
import DashboardHero from '@/components/dashboard/DashboardHero.vue'
import ParticipantsTab from '@/components/dashboard/ParticipantsTab.vue'
import StatsTab from '@/components/dashboard/StatsTab.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const tab = computed<'participants' | 'stats'>(() =>
  route.query.tab === 'stats' ? 'stats' : 'participants',
)

function setTab(value: 'participants' | 'stats') {
  router.push({ name: 'home', query: value === 'stats' ? { tab: 'stats' } : {} })
}
</script>

<template>
  <div class="dash">
    <DashboardHero />

    <div class="shell" style="padding-top: 32px">
      <div class="row" style="margin-bottom: 24px; gap: 12px">
        <div class="tabbar">
          <button
            class="tab"
            :class="{ active: tab === 'participants' }"
            @click="setTab('participants')"
          >
            {{ t('dashboard.tabsParticipants') }}
          </button>
          <button class="tab" :class="{ active: tab === 'stats' }" @click="setTab('stats')">
            {{ t('dashboard.tabsStats') }}
          </button>
        </div>
      </div>

      <ParticipantsTab v-if="tab === 'participants'" />
      <StatsTab v-else />
    </div>
  </div>
</template>
