<script setup>
const props = defineProps({
  label: String,
  modelValue: Number,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  suffix: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

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
      <span v-if="suffix" class="slider-control__suffix">{{ suffix }}</span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="$emit('update:modelValue', Number($event.target.value))"
    />
  </div>
</template>

<style lang="scss" scoped>
.slider-control {
  margin-bottom: var(--space-3);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  &__label {
    flex: 1;
    font-size: var(--text-xs);
    color: var(--color-text-2);
  }

  &__input {
    width: 48px;
    padding: 1px var(--space-1);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    text-align: right;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-1);
    -moz-appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      display: none;
    }

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  }

  &__suffix {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    margin-left: 2px;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--color-accent);
  }
}
</style>
