<script setup lang="ts" generic="T extends string | number">
const props = defineProps<{
  modelValue: T
  options: ReadonlyArray<{ value: T; label: string }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: T): void }>()

function pick(value: T) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
</script>

<template>
  <div class="seg-control">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="seg"
      :class="{ 'is-on': opt.value === modelValue }"
      @click="pick(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
