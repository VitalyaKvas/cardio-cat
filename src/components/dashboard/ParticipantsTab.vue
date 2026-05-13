<script setup lang="ts">
import ActionBar from '@/components/dashboard/ActionBar.vue'
import AddCard from '@/components/dashboard/AddCard.vue'
import ParticipantCard from '@/components/dashboard/ParticipantCard.vue'
import Icon from '@/components/ui/Icon.vue'
import { useParticipantBle } from '@/composables/useParticipantBle'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useWorkoutStore()
const ui = useUiStore()
const ble = useParticipantBle()
const { t } = useI18n()

const selected = ref<string[]>([])

function toggle(id: string) {
  const i = selected.value.indexOf(id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(id)
}

function selectAll(value: boolean) {
  selected.value = value ? store.visibleParticipants.map((p) => p.id) : []
}

// Drop selections when a participant is hidden or deleted so the next workout
// starts only with people still on the dashboard.
watch(
  () => store.visibleParticipants.map((p) => p.id),
  (visibleIds) => {
    const visible = new Set(visibleIds)
    selected.value = selected.value.filter((id) => visible.has(id))
  },
)

onMounted(() => {
  void ble.autoReconnectAll()
})
</script>

<template>
  <ActionBar :selected="selected" @select-all="selectAll" />

  <div v-if="store.visibleParticipants.length === 0" class="dash-empty">
    <div class="empty-glyph">🐱</div>
    <h2 class="t-h2">{{ t('participantsTab.noTitle') }}</h2>
    <p class="t-caption" style="margin: 8px 0 24px; font-size: 14px">
      {{ t('participantsTab.noHint') }}
    </p>
    <button class="btn btn-cta btn-lg" @click="ui.openModal({ kind: 'new_participant' })">
      <Icon name="plus" :size="16" /> {{ t('participantsTab.addFirst') }}
    </button>
  </div>

  <div v-else class="grid-cards">
    <ParticipantCard
      v-for="p in store.visibleParticipants"
      :key="p.id"
      :p="p"
      :selected="selected.includes(p.id)"
      @toggle="toggle(p.id)"
    />
    <AddCard />
  </div>
</template>
