<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const ui = useUiStore()
const { t } = useI18n()
</script>

<template>
  <button class="add-card" @click="ui.openModal({ kind: 'new_participant' })">
    <span class="add-glyph"><Icon name="plus" :size="28" /></span>
    <span style="margin-top: 12px; font-weight: 600">{{ t('addCard.add') }}</span>
    <span class="t-caption" style="margin-top: 4px">{{ t('addCard.hint') }}</span>
  </button>
</template>
