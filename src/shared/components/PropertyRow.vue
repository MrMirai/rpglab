<script setup>
// Строка панели свойств: метка в левой колонке фиксированной ширины + контрол
// справа. Нужна, чтобы поля разных секций выстраивались по одной вертикали -
// раньше каждая секция верстала подпись по-своему и колонки не совпадали.
defineProps({
  label: { type: String, default: '' },
  // Метка над контролом, а не слева: для широких контролов (селект, дропзона)
  stacked: { type: Boolean, default: false },
})
</script>

<template>
  <div class="prop-row" :class="{ 'is-stacked': stacked }">
    <span v-if="label" class="prop-row__label">{{ label }}</span>
    <div class="prop-row__control">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.prop-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 24px;
  // Тот же нижний отступ, что у SliderControl: строки свойств и ползунки идут
  // вперемешку, ритм должен быть общим. Во flex-контейнерах с gap (панели
  // раздатки) отступ гасится - см. :where ниже.
  margin-bottom: var(--space-2);

  // Внутри контейнеров, которые уже расставляют промежутки сами (display:flex
  // + gap), собственный margin строки дал бы двойной отступ
  :where(.section-body) > & {
    margin-bottom: 0;
  }

  &__label {
    // Общая ширина колонки меток - она и выравнивает секции между собой
    flex: 0 0 56px;
    font-size: var(--text-xs);
    color: var(--color-text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__control {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  &.is-stacked {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-1);

    .prop-row__label {
      flex: none;
    }
  }
}
</style>
