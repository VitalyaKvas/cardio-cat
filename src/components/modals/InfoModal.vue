<script setup lang="ts">
import ModalShell from '@/components/modals/ModalShell.vue'
import Icon from '@/components/ui/Icon.vue'
import { useUiStore } from '@/stores/ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    title: string
    body: string
    code?: string
    tone?: 'info' | 'warn'
  }>(),
  { tone: 'info' },
)

const emit = defineEmits<{ (e: 'close'): void }>()
const ui = useUiStore()
const { t } = useI18n()
const copied = ref(false)

async function copyCode() {
  if (!props.code) return
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    ui.pushToast('success', t('common.copied'))
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    ui.pushToast('error', t('common.copyFailed'))
  }
}
</script>

<template>
  <ModalShell :title="title" @close="emit('close')">
    <div class="info-modal-body">
      <span>{{ body }}</span>

      <div v-if="code" class="info-code-block">
        <code class="info-code">{{ code }}</code>
        <button type="button" class="btn btn-soft info-copy-btn" @click="copyCode">
          <Icon name="check" v-if="copied" :size="14" />
          <Icon name="download" v-else :size="14" />
          {{ copied ? t('common.copied') : t('common.copy') }}
        </button>
      </div>
    </div>

    <template #foot>
      <button class="btn btn-cta" @click="emit('close')">{{ t('common.ok') }}</button>
    </template>
  </ModalShell>
</template>
