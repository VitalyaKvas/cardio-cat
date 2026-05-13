import { onUnmounted, ref } from 'vue'

export function useIntervalFn(fn: () => void, intervalMs: number, immediate = true) {
  const isActive = ref(false)
  let handle: ReturnType<typeof setInterval> | null = null

  function start() {
    if (isActive.value) return
    isActive.value = true
    if (immediate) fn()
    handle = setInterval(fn, intervalMs)
  }

  function stop() {
    if (handle != null) clearInterval(handle)
    handle = null
    isActive.value = false
  }

  start()
  onUnmounted(stop)

  return { start, stop, isActive }
}
