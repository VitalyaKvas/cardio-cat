<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

function iconFor(kind: string) {
  if (kind === 'success') return 'check'
  if (kind === 'error') return 'alert'
  if (kind === 'warn') return 'alert'
  return 'info'
}
</script>

<template>
  <div class="toast-stack">
    <div
      v-for="t in ui.toasts"
      :key="t.id"
      class="toast"
      :class="t.kind"
      @click="ui.dismissToast(t.id)"
    >
      <Icon :name="iconFor(t.kind)" :size="16" />
      <span>{{ t.text }}</span>
    </div>
  </div>
</template>
