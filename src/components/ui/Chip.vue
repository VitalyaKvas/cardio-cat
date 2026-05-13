<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'live' | 'success'
}>()
</script>

<template>
  <span class="chip" :class="variant">
    <slot />
  </span>
</template>
