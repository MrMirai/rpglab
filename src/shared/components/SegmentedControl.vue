<script setup>
// Переключатель одного значения из нескольких (сегменты в общей подложке).
// Тот же вид, что у табов сайдбара раздаток: группа читается как ОДИН контрол,
// а не как несколько отдельно стоящих кнопок.
//
// options - [{ value, label, icon?, title? }]. Иконка опциональна: с ней сегмент
// становится вертикальным (иконка над подписью) - режим кнопок «Добавить».
defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true },
  // Сегменты в две колонки вместо одного ряда (сетка добавления элементов)
  grid: { type: Boolean, default: false },
  // Иконка над подписью; без него иконка идёт слева от текста
  stacked: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="seg" :class="{ 'is-grid': grid, 'is-stacked': stacked }">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="seg__item"
      :class="{ 'is-active': modelValue === opt.value }"
      :title="opt.title || opt.label"
      @click="$emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" :size="stacked ? 17 : 14" />
      <span v-if="opt.label" class="seg__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.seg {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  &.is-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  &__item {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-width: 0;
    height: 26px;
    padding: 0 var(--space-2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-2);
    font-family: inherit;
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(.is-active) {
      color: var(--color-text-1);
    }

    &.is-active {
      background: var(--color-bg-3);
      color: var(--color-accent);
    }
  }

  &.is-stacked &__item {
    flex-direction: column;
    justify-content: center;
    gap: var(--space-1);
    height: 56px;
    line-height: var(--leading-tight);
  }

  &__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
