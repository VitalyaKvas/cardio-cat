<script setup lang="ts">
import ModalShell from '@/components/modals/ModalShell.vue'
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    title: string
    body: string
    confirmLabel: string
    kind?: 'danger' | 'cta'
  }>(),
  { kind: 'cta' },
)

const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>()
const { t } = useI18n()
</script>

<template>
  <ModalShell :title="title" @close="emit('close')">
    <p style="margin: 0">{{ body }}</p>
    <template #foot>
      <button class="btn btn-ghost" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button
        class="btn"
        :class="kind === 'danger' ? 'btn-danger' : 'btn-cta'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </ModalShell>
</template>
