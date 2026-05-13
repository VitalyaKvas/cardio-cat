<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="toggle"
    :class="{ 'is-on': modelValue }"
    :aria-pressed="modelValue"
    @click="toggle"
  >
    <span class="toggle-knob" />
  </button>
</template>
