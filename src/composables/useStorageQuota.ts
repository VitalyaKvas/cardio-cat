import { ref } from 'vue'

export type StorageQuotaState = {
  usage: number | null
  quota: number | null
  persisted: boolean
}

export function useStorageQuota() {
  const state = ref<StorageQuotaState>({ usage: null, quota: null, persisted: false })

  function isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.storage?.estimate
  }

  async function refresh() {
    if (!isSupported()) return
    try {
      const est = await navigator.storage.estimate()
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false
      state.value = {
        usage: est.usage ?? null,
        quota: est.quota ?? null,
        persisted,
      }
    } catch {
      // ignore — leave previous values
    }
  }

  async function requestPersistent(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
    try {
      const granted = await navigator.storage.persist()
      state.value = { ...state.value, persisted: granted }
      return granted
    } catch {
      return false
    }
  }

  return { state, isSupported, refresh, requestPersistent }
}
