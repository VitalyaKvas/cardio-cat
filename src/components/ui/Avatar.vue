<script setup lang="ts">
import { BRAND_ACCENT } from '@/lib/color'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    glyph: string
    color?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  { color: BRAND_ACCENT, size: 'md' },
)

const sizeClass = computed(
  () =>
    ({
      sm: 'avatar avatar-sm',
      md: 'avatar',
      lg: 'avatar avatar-lg',
      xl: 'avatar avatar-xl',
    })[props.size],
)

const tint = computed(() => `${props.color}22`)
</script>

<template>
  <div :class="sizeClass" :style="{ background: tint, color }">
    <span>{{ glyph }}</span>
  </div>
</template>
