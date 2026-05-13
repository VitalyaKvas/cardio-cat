<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  tone?: 'text' | 'tangerine'
}>()
</script>

<template>
  <div class="profile-stat" :class="`tone-${tone ?? 'text'}`">
    <div class="t-eyebrow">{{ label }}</div>
    <div class="t-mono" style="font-size: 28px; font-weight: 700; margin-top: 4px">
      {{ value }}
    </div>
  </div>
</template>
