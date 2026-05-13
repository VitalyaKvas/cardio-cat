<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import ModalShell from '@/components/modals/ModalShell.vue'
import { ageFromYob } from '@/lib/zones'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ (e: 'close'): void }>()

const store = useWorkoutStore()
const ui = useUiStore()
const { t } = useI18n()

const candidates = computed(() => {
  const inSession = new Set(store.currentSession?.participantIds ?? [])
  return store.visibleParticipants.filter((p) => !inSession.has(p.id))
})

function add(id: string) {
  const ok = store.addToActiveSession(id)
  const p = store.participants.find((x) => x.id === id)
  if (ok && p) ui.pushToast('success', t('addToWorkoutT.joinedToast', { name: p.name }))
}

function openNew() {
  emit('close')
  ui.openModal({ kind: 'new_participant' })
}
</script>

<template>
  <ModalShell :title="t('addToWorkoutT.title')" wide @close="emit('close')">
    <p class="t-caption" style="margin: 0">{{ t('addToWorkoutT.hint') }}</p>
    <div class="add-list">
      <div v-for="p in candidates" :key="p.id" class="add-row">
        <Avatar :glyph="p.avatar" :color="p.color" />
        <div style="flex: 1">
          <div style="font-weight: 700">{{ p.name }}</div>
          <div class="t-caption">{{ ageFromYob(p.yob) }} {{ t('participant.years') }}</div>
        </div>
        <button class="btn btn-cta" @click="add(p.id)">
          <Icon name="plus" :size="14" /> {{ t('addToWorkoutT.addBtn') }}
        </button>
      </div>
      <p v-if="candidates.length === 0" class="muted">{{ t('addToWorkoutT.allInSession') }}</p>
    </div>
    <button class="btn btn-soft" style="align-self: flex-start; margin-top: 8px" @click="openNew">
      <Icon name="user-plus" :size="14" /> {{ t('addToWorkoutT.createNew') }}
    </button>

    <template #foot>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('addToWorkoutT.done') }}</button>
    </template>
  </ModalShell>
</template>
