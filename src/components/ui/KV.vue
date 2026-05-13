<script setup lang="ts">
defineProps<{
  k: string
  v: string | number
  tone?: 'default' | 'tangerine'
}>()
</script>

<template>
  <div class="kv">
    <div class="t-caption">{{ k }}</div>
    <div class="kv-v" :class="{ 'tone-tangerine': tone === 'tangerine' }">{{ v }}</div>
  </div>
</template>
