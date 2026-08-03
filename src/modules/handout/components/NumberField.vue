<script setup>
// Компактное числовое поле панелей свойств. Метка живёт ВНУТРИ рамки поля
// (как в Figma), поэтому поля одинаковой ширины стыкуются в ровную сетку,
// а подпись не съедает место у значения.
import { ref } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: -Infinity },
  max: { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
  suffix: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)

function clamp(val) {
  return Math.min(props.max, Math.max(props.min, val))
}

function commit(e) {
  const val = Number(e.target.value)
  if (Number.isNaN(val)) return
  emit('update:modelValue', clamp(val))
}

// Протяжка значения мышью по метке - основной способ правки числа в Figma:
// быстрее, чем целиться в поле и печатать. Shift ускоряет шаг в 10 раз.
let dragStartX = 0
let dragStartValue = 0
const dragging = ref(false)

function onDragStart(e) {
  dragging.value = true
  dragStartX = e.clientX
  dragStartValue = props.modelValue
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}

function onDragMove(e) {
  const mult = e.shiftKey ? 10 : 1
  const next = dragStartValue + (e.clientX - dragStartX) * props.step * mult
  // Дробный шаг (0.05 у межстрочного) не должен копить хвост из-за float
  const rounded = Math.round(next / props.step) * props.step
  emit('update:modelValue', clamp(Number(rounded.toFixed(4))))
}

function onDragEnd() {
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
}
</script>

<template>
  <div class="num" :class="{ 'is-dragging': dragging }">
    <span
      v-if="label"
      class="num__label"
      :title="`Потяните, чтобы изменить (${label})`"
      @pointerdown.prevent="onDragStart"
    >{{ label }}</span>
    <input
      ref="inputRef"
      type="number"
      :value="modelValue"
      :step="step"
      @change="commit"
      @keydown.enter="commit"
    />
    <span v-if="suffix" class="num__suffix">{{ suffix }}</span>
  </div>
</template>

<style lang="scss" scoped>
.num {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  height: 22px;
  padding: 0 var(--space-1) 0 var(--space-2);
  background: var(--color-bg-1);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus-within {
    border-color: var(--color-accent);
    background: var(--color-bg-1);
  }

  &.is-dragging {
    border-color: var(--color-accent);
  }

  &__label {
    flex-shrink: 0;
    min-width: 9px;
    font-size: var(--text-xs);
    color: var(--color-text-3);
    text-align: center;
    cursor: ew-resize;
    user-select: none;

    &:hover {
      color: var(--color-text-2);
    }
  }

  &__suffix {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--color-text-3);
  }

  input {
    width: 100%;
    min-width: 0;
    padding: 0;
    font-size: var(--text-xs);
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    background: none;
    border: none;
    color: var(--color-text-1);
    appearance: textfield;
    -moz-appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      display: none;
    }

    &:focus {
      outline: none;
    }
  }
}
</style>
