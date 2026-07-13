<script setup>
import { ref, computed } from 'vue'
import { RotateCw, FlipHorizontal2, FlipVertical2 } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import NumberField from './NumberField.vue'

// Объединённая секция «Позиция и размер» (бывшие Position + Layout): поворот
// на 90°, отражение H/V и числовые поля X/Y/W/H/∠. Работает и с одиночным
// элементом, и с мультивыделением (elements — массив): X/Y/W/H двигают/
// масштабируют относительно первого выбранного (дельтой, чтобы не схлопнуть
// элементы в одну точку), поворот/flip применяются к каждому по отдельности.
// Выравнивание живёт в тулбаре шапки (1 элемент → по странице, ≥2 → друг
// относительно друга) — здесь его намеренно нет.
const props = defineProps({
  elements: { type: Array, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const open = ref(true)

const isMulti = computed(() => props.elements.length > 1)
const first = computed(() => props.elements[0])
// Высота скрыта, если среди выбранных есть хоть один TEXT (авто-высота)
const hasText = computed(() => props.elements.some((e) => e.type === 'TEXT'))

function update(patch, key = null) {
  history.record(store, key ? `tf-${key}` : null)
  props.elements.forEach((el) => store.updateElement(el.id, patch))
}

// Числовое поле, применяемое дельтой ко всем выбранным (X/Y/W)
function updateByDelta(field, value, key) {
  const delta = value - first.value[field]
  if (delta === 0) return
  history.record(store, `tf-${key}`)
  props.elements.forEach((el) => store.updateElement(el.id, { [field]: el[field] + delta }))
}

function rotate90() {
  history.record(store)
  props.elements.forEach((el) => store.rotateElement90(el.id, 1))
}

function flip(axis) {
  history.record(store)
  props.elements.forEach((el) => store.flipElement(el.id, axis))
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
        <BaseButton size="sm" square :active="!isMulti && first.flipX" title="Отразить по горизонтали" @click="flip('x')">
          <FlipHorizontal2 :size="14" />
        </BaseButton>
        <BaseButton size="sm" square :active="!isMulti && first.flipY" title="Отразить по вертикали" @click="flip('y')">
          <FlipVertical2 :size="14" />
        </BaseButton>
      </div>

      <!-- Числовые поля -->
      <div class="fields-grid">
        <NumberField label="X" :model-value="first.x"
          @update:model-value="isMulti ? updateByDelta('x', $event, 'x') : update({ x: $event }, 'x')" />
        <NumberField label="Y" :model-value="first.y"
          @update:model-value="isMulti ? updateByDelta('y', $event, 'y') : update({ y: $event }, 'y')" />
        <NumberField label="W" :model-value="first.width" :min="8" :max="4000"
          @update:model-value="isMulti ? updateByDelta('width', $event, 'w') : update({ width: $event }, 'w')" />
        <NumberField
          v-if="!hasText"
          label="H" :model-value="first.height" :min="8" :max="4000"
          @update:model-value="isMulti ? updateByDelta('height', $event, 'h') : update({ height: $event }, 'h')"
        />
        <NumberField label="∠" :model-value="first.rotation" :min="-360" :max="360"
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
