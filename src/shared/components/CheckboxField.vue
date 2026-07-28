<script setup>
import { ref, watchEffect } from 'vue'
import { Check, Minus } from 'lucide-vue-next'

// Кастомный чекбокс: нативный input[type=checkbox] не стилизуется
// кроссбраузерно (системный синий цвет, свой размер), поэтому реальный input
// прячем визуально, но оставляем в DOM — на нём держатся доступность и
// клавиатура (Tab/Space), а рисуем свой бокс через :checked-соседа.
// Роль та же, что у ColorButton/SelectField: shared-UI без бизнес-логики,
// решение «что значит отмечено» принимает родитель.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  // Промежуточное состояние (часть выбранного) — для мультивыделений
  indeterminate: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// indeterminate — DOM-СВОЙСТВО, а не атрибут: через :indeterminate в шаблоне
// оно не выставится, и CSS-селектор :indeterminate никогда не сработает.
// Поэтому пишем его на узел вручную.
const inputRef = ref(null)
watchEffect(() => {
  if (inputRef.value) inputRef.value.indeterminate = props.indeterminate
})
</script>

<template>
  <label class="checkbox-field" :class="{ 'checkbox-field--disabled': disabled }">
    <input
      ref="inputRef"
      class="checkbox-field__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', $event.target.checked)"
    />
    <span class="checkbox-field__box">
      <Minus v-if="indeterminate && !modelValue" :size="11" :stroke-width="3" />
      <Check v-else :size="11" :stroke-width="3" />
    </span>
    <span v-if="label || $slots.default" class="checkbox-field__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style lang="scss" scoped>
.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: 2px 0;
  user-select: none;
  // ОБЯЗАТЕЛЬНО: спрятанный input внутри — absolute, и без этого его containing
  // block стал бы .app-layout (fixed inset:0). Тогда input не едет вместе с
  // прокруткой панели свойств и остаётся там, где был бы без скролла — в
  // редакторе это далеко за низом экрана. Клик по метке фокусирует input,
  // браузер тянет его в видимую область и прокручивает .app-layout (overflow:
  // hidden скроллбары убирает, но scroll-into-view контейнер всё равно двигает)
  // — весь редактор вместе с шапкой уезжал вверх.
  position: relative;

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

// Прячем нативный input, не убирая его из потока фокуса
.checkbox-field__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  margin: 0;
  pointer-events: none;
}

.checkbox-field__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-bg-1);
  color: transparent;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);

  // Галочка появляется только когда отмечено — в остальное время
  // иконка прозрачная, чтобы бокс не «прыгал» по размеру
  svg {
    display: block;
  }
}

.checkbox-field__label {
  font-size: var(--text-xs);
  color: var(--color-text-2);
  line-height: 1.3;
  transition: color var(--transition-fast);
}

.checkbox-field:hover:not(.checkbox-field--disabled) {
  .checkbox-field__box {
    border-color: var(--color-accent);
  }

  .checkbox-field__label {
    color: var(--color-text-1);
  }
}

// Отмеченное / промежуточное состояние — заливка акцентом
.checkbox-field__input:checked + .checkbox-field__box,
.checkbox-field__input:indeterminate + .checkbox-field__box {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg-1);
}

// Клавиатурный фокус — кольцо только при навигации с клавиатуры
.checkbox-field__input:focus-visible + .checkbox-field__box {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
