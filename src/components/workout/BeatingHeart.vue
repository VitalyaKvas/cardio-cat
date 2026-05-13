<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    bpm: number
    color?: string
    stale?: boolean
    size?: 'md' | 'lg'
    intense?: boolean
  }>(),
  { stale: false, size: 'md', color: 'var(--c-crimson)', intense: false },
)

const heartSize = computed(() => (props.size === 'lg' ? 56 : 36))

const heartStyle = computed(() => ({
  color: props.stale ? 'var(--d-text-3)' : 'var(--c-crimson)',
}))

const ringStyle = computed(() => ({
  borderColor: props.stale ? 'var(--d-text-3)' : 'var(--c-crimson)',
}))

// CSS keyframes run at the 1 s baseline (60 bpm). We don't touch
// animation-duration on bpm changes — that restarts the animation. Instead
// we adjust `playbackRate` on every active Animation, which smoothly
// accelerates or decelerates while preserving the current keyframe progress.
const root = ref<HTMLElement | null>(null)
let rafHandle = 0

function rateForBpm(bpm: number): number {
  if (!bpm || bpm <= 0) return 1
  // Clamp to the same sane window the old `dur` used (0.25 s … 2 s per beat).
  return Math.max(0.5, Math.min(4, bpm / 60))
}

function syncAnimations() {
  if (!root.value) return
  const rate = rateForBpm(props.bpm)
  for (const a of root.value.getAnimations({ subtree: true })) {
    a.playbackRate = rate
    if (props.stale) a.pause()
    else if (a.playState === 'paused') a.play()
  }
}

function scheduleSync() {
  cancelAnimationFrame(rafHandle)
  // Wait one frame so newly-mounted CSS animations are registered before we
  // try to read them.
  rafHandle = requestAnimationFrame(syncAnimations)
}

onMounted(scheduleSync)
onBeforeUnmount(() => cancelAnimationFrame(rafHandle))
watch(() => [props.bpm, props.stale, props.intense], scheduleSync)
</script>

<template>
  <div ref="root" class="heart-stack" :class="{ 'is-intense': intense && !stale }">
    <div class="heart-ring" :style="ringStyle" />
    <div v-if="intense && !stale" class="heart-splatter" />
    <div class="heart-glyph" :style="heartStyle">
      <Icon name="heart" :size="heartSize" color="currentColor" fill="currentColor" />
    </div>
  </div>
</template>
