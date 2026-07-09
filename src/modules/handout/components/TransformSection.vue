<script setup>
import { ref } from 'vue'
import { RotateCw, FlipHorizontal2, FlipVertical2 } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import NumberField from './NumberField.vue'

// Объединённая секция «Позиция и размер» (бывшие Position + Layout) для одиночно
// выбранного элемента: поворот на 90°, отражение H/V и числовые поля X/Y/W/H/∠.
// Выравнивание живёт в тулбаре шапки (1 элемент → по странице, ≥2 → друг
// относительно друга) — здесь его намеренно нет.
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const open = ref(true)

function update(patch, key = null) {
  history.record(store, key ? `tf-${key}:${props.element.id}` : null)
  store.updateElement(props.element.id, patch)
}

function rotate90() {
  history.record(store)
  store.rotateElement90(props.element.id, 1)
}

function flip(axis) {
  history.record(store)
  store.flipElement(props.element.id, axis)
}
</script>

<template>
  <CollapsibleSection v-model:open="open" label="Позиция и размер">
    <div class="section-body">
      <!-- Поворот и отражение -->
      <div class="tf-transform">
        <BaseButton size="sm" square title="Повернуть на 90°" @click="rotate90">
          <RotateCw :size="14" />
        </BaseButton>
        <BaseButton size="sm" square :active="element.flipX" title="Отразить по горизонтали" @click="flip('x')">
          <FlipHorizontal2 :size="14" />
        </BaseButton>
        <BaseButton size="sm" square :active="element.flipY" title="Отразить по вертикали" @click="flip('y')">
          <FlipVertical2 :size="14" />
        </BaseButton>
      </div>

      <!-- Числовые поля -->
      <div class="fields-grid">
        <NumberField label="X" :model-value="element.x"
          @update:model-value="update({ x: $event }, 'x')" />
        <NumberField label="Y" :model-value="element.y"
          @update:model-value="update({ y: $event }, 'y')" />
        <NumberField label="W" :model-value="element.width" :min="8" :max="4000"
          @update:model-value="update({ width: $event }, 'w')" />
        <NumberField
          v-if="element.type !== 'TEXT'"
          label="H" :model-value="element.height" :min="8" :max="4000"
          @update:model-value="update({ height: $event }, 'h')"
        />
        <NumberField label="∠" :model-value="element.rotation" :min="-360" :max="360"
          @update:model-value="update({ rotation: $event }, 'rot')" />
      </div>
    </div>
  </CollapsibleSection>
</template>

<style lang="scss" scoped>
.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-3);
}

.tf-transform {
  display: flex;
  gap: var(--space-1);
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
</style>
