<script setup lang="ts">
import AddToWorkoutModal from '@/components/modals/AddToWorkoutModal.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import FinishWorkoutModal from '@/components/modals/FinishWorkoutModal.vue'
import InfoModal from '@/components/modals/InfoModal.vue'
import ParticipantFormModal from '@/components/modals/ParticipantFormModal.vue'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const ui = useUiStore()
const store = useWorkoutStore()
const { t } = useI18n()

const target = computed(() => ui.modal)

const participantForModal = computed(() => {
  const m = target.value
  if (!m) return null
  if (m.kind === 'edit_participant') return store.participants.find((p) => p.id === m.id) ?? null
  return null
})

function confirmHide() {
  const m = target.value
  if (m?.kind !== 'hide_participant') return
  const p = store.participants.find((x) => x.id === m.id)
  if (p) {
    store.hideParticipant(p.id)
    ui.pushToast('info', t('modals.movedToTrash', { name: p.name }))
  }
  ui.closeModal()
}

function confirmDeleteForever() {
  const m = target.value
  if (m?.kind !== 'delete_forever') return
  const p = store.participants.find((x) => x.id === m.id)
  if (p) {
    store.deleteForever(p.id)
    ui.pushToast('error', t('modals.deletedForever', { name: p.name }))
  }
  ui.closeModal()
}

async function confirmImportReplace() {
  const m = target.value
  if (m?.kind !== 'import_replace') return
  const res = await store.importJson(m.payload)
  if (res.ok) ui.pushToast('success', t('modals.imported'))
  else ui.pushToast('error', res.errorKey ? t(res.errorKey) : t('modals.importError'))
  ui.closeModal()
}

function confirmClearAll() {
  const m = target.value
  if (m?.kind !== 'clear_all') return
  store.clearAll()
  ui.pushToast('error', t('modals.clearedAll'))
  ui.closeModal()
}
</script>

<template>
  <template v-if="target">
    <ParticipantFormModal
      v-if="target.kind === 'new_participant' || target.kind === 'edit_participant'"
      :editing="participantForModal"
      @close="ui.closeModal()"
    />
    <FinishWorkoutModal v-else-if="target.kind === 'finish_workout'" @close="ui.closeModal()" />
    <AddToWorkoutModal v-else-if="target.kind === 'add_to_workout'" @close="ui.closeModal()" />
    <ConfirmModal
      v-else-if="target.kind === 'hide_participant'"
      :title="t('modals.hideTitle')"
      :body="t('modals.hideBody')"
      :confirm-label="t('modals.hideConfirm')"
      @confirm="confirmHide"
      @close="ui.closeModal()"
    />
    <ConfirmModal
      v-else-if="target.kind === 'delete_forever'"
      :title="t('modals.deleteTitle')"
      :body="t('modals.deleteBody')"
      :confirm-label="t('modals.deleteConfirm')"
      kind="danger"
      @confirm="confirmDeleteForever"
      @close="ui.closeModal()"
    />
    <ConfirmModal
      v-else-if="target.kind === 'import_replace'"
      :title="t('modals.importTitle')"
      :body="t('modals.importBody')"
      :confirm-label="t('modals.importConfirm')"
      kind="danger"
      @confirm="confirmImportReplace"
      @close="ui.closeModal()"
    />
    <ConfirmModal
      v-else-if="target.kind === 'clear_all'"
      :title="t('modals.clearTitle')"
      :body="t('modals.clearBody')"
      :confirm-label="t('modals.clearConfirm')"
      kind="danger"
      @confirm="confirmClearAll"
      @close="ui.closeModal()"
    />
    <InfoModal
      v-else-if="target.kind === 'info_help'"
      :title="target.title"
      :body="target.body"
      :code="target.code"
      :tone="target.tone ?? 'info'"
      @close="ui.closeModal()"
    />
  </template>
</template>
