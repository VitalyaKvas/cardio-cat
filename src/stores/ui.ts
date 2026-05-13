import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info' | 'warn'
export type Toast = { id: number; kind: ToastKind; text: string }

export type ModalDescriptor =
  | { kind: 'new_participant' }
  | { kind: 'edit_participant'; id: string }
  | { kind: 'hide_participant'; id: string }
  | { kind: 'delete_forever'; id: string }
  | { kind: 'finish_workout' }
  | { kind: 'add_to_workout' }
  | { kind: 'import_replace'; payload: string }
  | { kind: 'clear_all' }
  | { kind: 'info_help'; tone?: 'info' | 'warn'; title: string; body: string; code?: string }

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  const modal = ref<ModalDescriptor | null>(null)

  let nextId = 1

  function pushToast(kind: ToastKind, text: string, ttlMs = 4000): number {
    const id = nextId++
    toasts.value.push({ id, kind, text })
    if (ttlMs > 0) {
      setTimeout(() => dismissToast(id), ttlMs)
    }
    return id
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function openModal(descriptor: ModalDescriptor) {
    modal.value = descriptor
  }

  function closeModal() {
    modal.value = null
  }

  return { toasts, modal, pushToast, dismissToast, openModal, closeModal }
})
