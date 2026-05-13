<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  unit?: string
  tone?: 'text' | 'tangerine' | 'crimson' | 'green'
}>()
</script>

<template>
  <div class="big-stat" :class="`tone-${tone ?? 'text'}`">
    <div class="big-stat-label">{{ label }}</div>
    <div class="big-stat-row">
      <span class="big-stat-value">{{ value }}</span>
      <span v-if="unit" class="big-stat-unit">{{ unit }}</span>
    </div>
  </div>
</template>
