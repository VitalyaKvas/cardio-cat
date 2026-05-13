<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import SegControl from '@/components/ui/SegControl.vue'
import ModalShell from '@/components/modals/ModalShell.vue'
import { BRAND_ACCENT } from '@/lib/color'
import { AVATAR_POOL, COLOR_POOL } from '@/lib/seed'
import { ageFromYob, maxHr } from '@/lib/zones'
import { useUiStore } from '@/stores/ui'
import { useWorkoutStore, type Participant, type Sex } from '@/stores/workout'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

type SexChoice = 'M' | 'F' | '?'

const props = defineProps<{ editing: Participant | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const store = useWorkoutStore()
const ui = useUiStore()
const { t } = useI18n()

const name = ref(props.editing?.name ?? '')
const avatar = ref(props.editing?.avatar ?? '🦊')
const color = ref(props.editing?.color ?? BRAND_ACCENT)
const yob = ref<number | null>(props.editing?.yob ?? 1990)
const weight = ref<number | null>(props.editing?.weight ?? 70)
const sex = ref<SexChoice>(
  (props.editing?.sex ?? 'M') === null ? 'M' : (props.editing?.sex as SexChoice),
)

const sexOptions = computed<ReadonlyArray<{ value: SexChoice; label: string }>>(() => [
  { value: 'M', label: t('participantFormT.male') },
  { value: 'F', label: t('participantFormT.female') },
  { value: '?', label: t('participantFormT.notSpecified') },
])

function toStoreSex(v: SexChoice): Sex {
  return v
}

const ageLabel = computed(() => `${ageFromYob(yob.value)} ${t('participant.years')}`)
const maxHrLabel = computed(() => t('participantFormT.maxHrLabel', { value: maxHr(yob.value) }))
const trimmedValid = computed(() => name.value.trim().length > 0)

function save() {
  if (!trimmedValid.value) {
    ui.pushToast('warn', t('participantFormT.nameRequired'))
    return
  }
  const persistedSex = toStoreSex(sex.value)
  if (props.editing) {
    store.updateParticipant(props.editing.id, {
      name: name.value.trim(),
      avatar: avatar.value,
      color: color.value,
      yob: yob.value,
      weight: weight.value,
      sex: persistedSex,
    })
    ui.pushToast('success', t('participantFormT.savedToast'))
  } else {
    store.addParticipant({
      name: name.value.trim(),
      avatar: avatar.value,
      color: color.value,
      yob: yob.value,
      weight: weight.value,
      sex: persistedSex,
    })
    ui.pushToast('success', t('participantFormT.addedToast'))
  }
  emit('close')
}
</script>

<template>
  <ModalShell
    :title="
      editing
        ? t('participantFormT.editTitle', { name: editing.name })
        : t('participantFormT.newTitle')
    "
    wide
    @close="emit('close')"
  >
    <div style="display: flex; flex-direction: column; align-items: center">
      <Avatar :glyph="avatar" :color="color" size="xl" />
    </div>

    <div class="field">
      <label class="label">{{ t('participantFormT.name') }}</label>
      <input
        v-model="name"
        class="input"
        :placeholder="t('participantFormT.namePlaceholder')"
        maxlength="30"
        autofocus
      />
      <div class="help">{{ t('participantFormT.nameHint') }}</div>
    </div>

    <div class="field">
      <label class="label">{{ t('participantFormT.avatar') }}</label>
      <div class="avatar-row">
        <button
          v-for="a in AVATAR_POOL"
          :key="a"
          type="button"
          class="avatar-opt"
          :class="{ 'is-active': a === avatar }"
          @click="avatar = a"
        >
          {{ a }}
        </button>
      </div>
    </div>

    <div class="field">
      <label class="label">{{ t('participantFormT.color') }}</label>
      <div class="color-row">
        <button
          v-for="c in COLOR_POOL"
          :key="c"
          type="button"
          class="color-swatch"
          :class="{ 'is-active': c === color }"
          :style="{ '--sw': c } as Record<string, string>"
          @click="color = c"
        />
      </div>
    </div>

    <div class="form-grid-2">
      <div class="field">
        <label class="label">{{ t('participantFormT.yob') }}</label>
        <input
          v-model.number="yob"
          class="input"
          type="number"
          inputmode="numeric"
          min="1920"
          max="2015"
        />
        <div class="help">{{ ageLabel }} · {{ maxHrLabel }}</div>
      </div>
      <div class="field">
        <label class="label">{{ t('participantFormT.weight') }}</label>
        <input
          v-model.number="weight"
          class="input"
          type="number"
          inputmode="numeric"
          min="20"
          max="300"
        />
        <div class="help">{{ t('participantFormT.weightHint') }}</div>
      </div>
    </div>

    <div class="field">
      <label class="label">{{ t('participantFormT.sexHint') }}</label>
      <SegControl v-model="sex" :options="sexOptions" />
    </div>

    <template #foot>
      <button class="btn btn-ghost" @click="emit('close')">
        {{ t('participantFormT.cancel') }}
      </button>
      <button class="btn btn-cta" :disabled="!trimmedValid" @click="save">
        <Icon name="check" :size="14" /> {{ t('participantFormT.save') }}
      </button>
    </template>
  </ModalShell>
</template>
