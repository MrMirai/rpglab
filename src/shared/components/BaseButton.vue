<script setup>
// Единая переиспользуемая кнопка — заменяет разрозненные .toggle-btn/.preset-btn/
// .save-btn/.modal__close и т.п., дублировавшиеся в компонентах модулей.
// variant:
//   outline — прозрачная, рамка var(--color-border), hover → accent (дефолт)
//   accent  — заливка акцентом (primary-действие)
//   danger  — заливка danger (деструктивное действие)
//   ghost   — без рамки, только смена цвета текста на hover
// size: sm (компактно, панели свойств) | md (шапка, формы, модалки)
// active — состояние выбранного пункта toggle/segmented-группы (фон accent-muted)
// square — квадратная icon-only кнопка (close/delete/degree-controls)
defineProps({
  variant: { type: String, default: 'outline' }, // outline | accent | danger | ghost
  size: { type: String, default: 'md' }, // sm | md
  active: { type: Boolean, default: false },
  square: { type: Boolean, default: false },
  // Для outline/ghost: hover красит в danger вместо accent (close/delete-кнопки)
  dangerHover: { type: Boolean, default: false },
  // Кнопка растягивается на всю ширину/долю флекс-контейнера (toggle-группы)
  fullWidth: { type: Boolean, default: false },
  // 'button' (дефолт) | 'submit' — для кнопок отправки форм
  type: { type: String, default: 'button' },
})
</script>

<template>
  <button
    :type="type"
    class="base-btn"
    :class="[
      `base-btn--${variant}`,
      `base-btn--${size}`,
      { 'is-active': active, 'is-square': square, 'is-danger-hover': dangerHover, 'is-full-width': fullWidth },
    ]"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // --- Размеры ---
  &--sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
  }

  &--md {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  &.is-square {
    padding: 0;
    flex-shrink: 0;
  }

  &--sm.is-square {
    width: 24px;
    height: 24px;
  }

  &--md.is-square {
    width: 28px;
    height: 28px;
  }

  &.is-full-width {
    flex: 1;
    width: 100%;
  }

  // --- Варианты ---
  &--outline {
    border-color: var(--color-border);

    &:hover:not(:disabled):not(.is-active):not(.is-danger-hover) {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    &.is-active {
      background: var(--color-accent-muted);
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    &.is-danger-hover:hover:not(:disabled) {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }

  &--ghost {
    &:hover:not(:disabled):not(.is-active):not(.is-danger-hover) {
      color: var(--color-accent);
    }

    &.is-active {
      background: var(--color-accent-muted);
      color: var(--color-accent);
    }

    &.is-danger-hover:hover:not(:disabled) {
      color: var(--color-danger);
    }
  }

  &--accent {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-bg-1);

    &:hover:not(:disabled) {
      background: var(--color-accent-hover);
      border-color: var(--color-accent-hover);
    }
  }

  &--danger {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: var(--color-bg-1);

    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  }
}
</style>
