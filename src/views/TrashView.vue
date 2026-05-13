<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import { relativeDay } from '@/lib/time'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore } from '@/stores/workout'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const store = useWorkoutStore()
const ui = useUiStore()
const router = useRouter()
const { t } = useI18n()

function restore(id: string, name: string) {
  store.restoreParticipant(id)
  ui.pushToast('success', t('trashView.restoredToast', { name }))
}

function emptyAll() {
  if (store.trashedParticipants.length === 0) return
  store.emptyTrash()
  ui.pushToast('error', t('trashView.purgedToast'))
}
</script>

<template>
  <div class="page">
    <div class="shell" style="padding-top: 32px; padding-bottom: 80px">
      <div class="row-sb" style="margin-bottom: 24px; flex-wrap: wrap; gap: 16px">
        <div>
          <div class="t-eyebrow">{{ t('trashView.archive') }}</div>
          <h1 class="t-h1" style="margin: 8px 0 0">{{ t('trashView.trashTitle') }}</h1>
          <p style="color: var(--c-text-3); margin-top: 8px">{{ t('trashView.hint') }}</p>
        </div>
        <button class="btn btn-ghost" @click="router.push({ name: 'home' })">
          <Icon name="arrow-left" :size="14" /> {{ t('trashView.back') }}
        </button>
      </div>

      <template v-if="store.trashedParticipants.length === 0">
        <div class="card card-pad empty">
          <div class="empty-glyph">🗑</div>
          <h3 class="t-h3">{{ t('trashView.empty') }}</h3>
          <p class="t-caption" style="margin-top: 6px">{{ t('trashView.emptyHint') }}</p>
        </div>
      </template>

      <template v-else>
        <div class="card" style="padding: 8px">
          <div
            v-for="(p, i) in store.trashedParticipants"
            :key="p.id"
            class="trash-row"
            :style="{
              borderBottom:
                i < store.trashedParticipants.length - 1 ? '1px solid var(--c-line)' : 'none',
            }"
          >
            <Avatar :glyph="p.avatar" :color="p.color" />
            <div style="flex: 1">
              <div style="font-weight: 700; font-size: 16px">{{ p.name }}</div>
              <div class="t-caption">
                {{ t('trashView.hiddenAt', { date: p.hiddenAt ? relativeDay(p.hiddenAt) : '—' }) }}
              </div>
            </div>
            <button class="btn btn-soft" @click="restore(p.id, p.name)">
              <Icon name="refresh" :size="14" /> {{ t('trashView.restore') }}
            </button>
            <button
              class="btn btn-ghost"
              style="color: var(--c-crimson)"
              @click="ui.openModal({ kind: 'delete_forever', id: p.id })"
            >
              <Icon name="trash" :size="14" /> {{ t('trashView.deleteOne') }}
            </button>
          </div>
          <div
            class="row"
            style="padding: 16px; border-top: 1px solid var(--c-line); justify-content: flex-end"
          >
            <button class="btn btn-danger" @click="emptyAll">
              <Icon name="trash" :size="14" /> {{ t('trashView.deleteAll') }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
