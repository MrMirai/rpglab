<script setup>
// Компактное числовое поле «метка + input» для панелей свойств раздатки.
const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: -Infinity },
  max: { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
})
const emit = defineEmits(['update:modelValue'])

function commit(e) {
  const val = Number(e.target.value)
  if (Number.isNaN(val)) return
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, val)))
}
</script>

<template>
  <label class="number-field">
    <span class="number-field__label">{{ label }}</span>
    <input
      type="number"
      :value="modelValue"
      :step="step"
      @change="commit"
      @keydown.enter="commit"
    />
  </label>
</template>

<style lang="scss" scoped>
.number-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    flex-shrink: 0;
    min-width: 14px;
  }

  input {
    width: 100%;
    min-width: 0;
    padding: 2px var(--space-1);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
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
}
</style>
