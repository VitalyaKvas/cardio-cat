<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string
    pawColor?: string
    pulseColor?: string
  }>(),
  {
    size: 32,
    pawColor: 'var(--accent)',
    pulseColor: '#ffffff',
  },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    class="brand-logo"
  >
    <circle cx="6.5" cy="11" r="2.6" :fill="pawColor" />
    <circle cx="12" cy="5.8" r="2.9" :fill="pawColor" />
    <circle cx="20" cy="5.8" r="2.9" :fill="pawColor" />
    <circle cx="25.5" cy="11" r="2.6" :fill="pawColor" />
    <path
      d="M16 11.5c-5.6 0-9.2 3.8-9.2 8.2 0 3.4 2.6 5.7 6.1 5.7 1.5 0 2.3-.6 3.1-.6s1.6.6 3.1.6c3.5 0 6.1-2.3 6.1-5.7 0-4.4-3.6-8.2-9.2-8.2z"
      :fill="pawColor"
    />
    <path
      d="M12 18.9h1.6l1.4-3.4 1.8 6 1.4-3.6h1.6"
      :stroke="pulseColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </svg>
</template>

<style scoped>
.brand-logo {
  display: block;
}
</style>
