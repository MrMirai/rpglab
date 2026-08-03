<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  modelValue: Number,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  suffix: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

// Заполнение слева от бегунка рисуем градиентом по дорожке: у кастомного
// ::-webkit-slider-runnable-track нет доступа к значению, а accent-color
// (который дал бы заливку сам) вернул бы и системный вид бегунка.
const fillPercent = computed(() => {
  const span = props.max - props.min
  if (!span) return 0
  const ratio = (props.modelValue - props.min) / span
  return Math.min(100, Math.max(0, ratio * 100))
})

function onInputChange(e) {
  const val = Number(e.target.value)
  const clamped = Math.min(props.max, Math.max(props.min, val))
  emit('update:modelValue', clamped)
}
</script>

<template>
  <div class="slider-control">
    <div class="slider-control__header">
      <span class="slider-control__label">{{ label }}</span>
      <input
        class="slider-control__input"
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        @change="onInputChange"
        @keydown.enter="onInputChange"
      />
      <!-- Слот единицы рендерится всегда: без него поля значений у ползунков
           без суффикса вставали бы правее остальных -->
      <span class="slider-control__suffix">{{ suffix }}</span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :style="{ '--fill': `${fillPercent}%` }"
      @input="$emit('update:modelValue', Number($event.target.value))"
    />
  </div>
</template>

<style lang="scss" scoped>
.slider-control {
  margin-bottom: var(--space-2);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    // Ползунок ниже начинается от левого края, поэтому подпись держим на той же
    // линии, что и метки PropertyRow, а число прижимаем вправо
    margin-bottom: var(--space-1);
  }

  &__label {
    flex: 1;
    min-width: 0;
    font-size: var(--text-xs);
    color: var(--color-text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__input {
    width: 50px;
    height: 22px;
    flex-shrink: 0;
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    text-align: right;
    background: var(--color-bg-1);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-text-1);
    appearance: textfield;
    -moz-appearance: textfield;
    transition: border-color var(--transition-fast);

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      display: none;
    }

    &:hover {
      border-color: var(--color-border-strong);
    }

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  }

  // Ширина фиксирована, иначе поле значения ездит по горизонтали от секции
  // к секции: у «px» и «%» разная ширина, а у части ползунков суффикса нет
  &__suffix {
    width: 16px;
    flex-shrink: 0;
    font-size: var(--text-xs);
    color: var(--color-text-3);
    margin-left: 2px;
  }

  // Ползунок рисуем сами: дефолтный системный слишком крупный и выбивается
  // из плотной сетки панели (accent-color красит только заполнение)
  input[type='range'] {
    display: block;
    width: 100%;
    height: 12px;
    margin: 0;
    background: none;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;

    // WebKit: заполнение - жёсткая граница градиента на --fill
    &::-webkit-slider-runnable-track {
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(
        to right,
        var(--color-accent) 0 var(--fill, 0%),
        var(--color-bg-1) var(--fill, 0%) 100%
      );
    }

    // Firefox красит заполнение сам через ::-moz-range-progress
    &::-moz-range-track {
      height: 3px;
      border-radius: 2px;
      background: var(--color-bg-1);
    }

    &::-moz-range-progress {
      height: 3px;
      border-radius: 2px;
      background: var(--color-accent);
    }

    &::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 11px;
      height: 11px;
      // Центрируем «шайбу» на дорожке: (3px трек - 11px шайба) / 2
      margin-top: -4px;
      border-radius: 50%;
      background: var(--color-accent);
      border: none;
      transition: background-color var(--transition-fast);
    }

    &::-moz-range-thumb {
      width: 11px;
      height: 11px;
      border: none;
      border-radius: 50%;
      background: var(--color-accent);
    }

    &:hover::-webkit-slider-thumb,
    &:active::-webkit-slider-thumb {
      background: var(--color-accent-hover);
    }

    &:hover::-moz-range-thumb,
    &:active::-moz-range-thumb {
      background: var(--color-accent-hover);
    }
  }
}
</style>
