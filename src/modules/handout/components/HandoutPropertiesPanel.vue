<script setup>
import { computed } from 'vue'
import { Trash2, Eye, Lock } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import SliderControl from '@/shared/components/SliderControl.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import DocumentProperties from './DocumentProperties.vue'
import TextProperties from './TextProperties.vue'
import ImageProperties from './ImageProperties.vue'
import ShapeProperties from './ShapeProperties.vue'

// Контекстная панель свойств: содержимое зависит от выделения.
// Ничего → документ; один элемент → свойства по типу; несколько → общие поля.
const store = useHandoutStore()
const history = useHandoutHistory()

const selectedElements = computed(() =>
  store.elements.filter((e) => store.selectedIds.includes(e.id)),
)

const single = computed(() =>
  selectedElements.value.length === 1 ? selectedElements.value[0] : null,
)

// Средняя прозрачность мультивыделения (для слайдера)
const multiOpacity = computed(() => {
  const els = selectedElements.value
  if (!els.length) return 100
  return Math.round((els.reduce((s, e) => s + e.opacity, 0) / els.length) * 100)
})

function setMultiOpacity(val) {
  history.record(store, 'multi-opacity')
  selectedElements.value.forEach((el) => store.updateElement(el.id, { opacity: val / 100 }))
}

function toggleMultiVisible() {
  history.record(store)
  const anyHidden = selectedElements.value.some((e) => !e.visible)
  selectedElements.value.forEach((el) => store.updateElement(el.id, { visible: anyHidden }))
}

function toggleMultiLocked() {
  history.record(store)
  const anyUnlocked = selectedElements.value.some((e) => !e.locked)
  selectedElements.value.forEach((el) => store.updateElement(el.id, { locked: anyUnlocked }))
}

function removeAll() {
  history.record(store)
  store.removeSelected()
}
</script>

<template>
  <div class="handout-props">
    <!-- Ничего не выбрано → свойства документа -->
    <DocumentProperties v-if="!selectedElements.length" />

    <!-- Один элемент → панель по типу -->
    <template v-else-if="single">
      <TextProperties v-if="single.type === 'TEXT'" :element="single" />
      <ImageProperties v-else-if="single.type === 'IMAGE'" :element="single" />
      <ShapeProperties v-else-if="single.type === 'SHAPE'" :element="single" />
    </template>

    <!-- Мультивыделение → общие поля -->
    <div v-else class="multi">
      <p class="multi__count">Выбрано элементов: {{ selectedElements.length }}</p>

      <SliderControl
        label="Прозрачность"
        :model-value="multiOpacity"
        :min="0" :max="100" :step="1" suffix="%"
        @update:model-value="setMultiOpacity"
      />

      <div class="multi__actions">
        <BaseButton size="sm" full-width @click="toggleMultiVisible">
          <Eye :size="14" /> Показ/скрыть
        </BaseButton>
        <BaseButton size="sm" full-width @click="toggleMultiLocked">
          <Lock :size="14" /> Блокировка
        </BaseButton>
      </div>

      <BaseButton size="sm" full-width danger-hover @click="removeAll">
        <Trash2 :size="14" /> Удалить всё
      </BaseButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.handout-props {
  width: 100%;
}

.multi {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);

  &__count {
    font-size: var(--text-sm);
    color: var(--color-text-2);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
  }
}
</style>
