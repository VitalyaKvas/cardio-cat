<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    wide?: boolean
  }>(),
  { wide: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()

function onScrim(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('scrim')) emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="scrim" @click="onScrim">
    <div class="modal" :class="{ wide: props.wide }">
      <div class="modal-head">
        <h3>{{ props.title }}</h3>
        <button type="button" class="x" @click="emit('close')">
          <Icon name="x" :size="16" />
        </button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
      <div v-if="$slots.foot" class="modal-foot">
        <slot name="foot" />
      </div>
    </div>
  </div>
</template>
