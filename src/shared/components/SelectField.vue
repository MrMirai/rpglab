<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'

// Кастомный select: та же роль, что у нативного <select>, но стилизуемый
// список опций (нативный <select> не даёт стилизовать выпадающую панель
// кроссбраузерно). Паттерн — как у ColorButton/UserMenu: Teleport в body +
// fixed-позиционирование по getBoundingClientRect + закрытие по клику вне.
//
// options — плоский массив [{ value, label }] ИЛИ массив групп
// [{ label, options: [{ value, label }] }] (авто-определяется по наличию
// поля options у элемента) — нужно для группировки шрифтов (optgroup).
const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, default: () => [] },
  optionStyle: { type: Function, default: null },
  placeholder: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const buttonRef = ref(null)
const popupRef = ref(null)
const popupStyle = ref({})

const groups = computed(() =>
  props.options.some((o) => Array.isArray(o.options))
    ? props.options
    : [{ label: null, options: props.options }],
)

const flatOptions = computed(() => groups.value.flatMap((g) => g.options))
const selectedOption = computed(() => flatOptions.value.find((o) => o.value === props.modelValue))

function toggle() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const viewH = window.innerHeight
  const margin = 4
  const maxPopupH = 260

  let top
  let maxHeight
  if (rect.bottom + maxPopupH + margin > viewH) {
    const spaceAbove = rect.top - margin
    maxHeight = Math.min(maxPopupH, spaceAbove)
    top = rect.top - maxHeight - margin
  } else {
    maxHeight = Math.min(maxPopupH, viewH - rect.bottom - margin)
    top = rect.bottom + margin
  }

  popupStyle.value = {
    position: 'fixed',
    top: Math.round(Math.max(margin, top)) + 'px',
    left: Math.round(rect.left) + 'px',
    width: Math.round(rect.width) + 'px',
    maxHeight: Math.round(maxHeight) + 'px',
    zIndex: 2000,
  }
}

function select(option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

function onClickOutside(e) {
  if (!isOpen.value) return
  if (buttonRef.value?.contains(e.target)) return
  if (popupRef.value?.contains(e.target)) return
  isOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div class="select-field" ref="buttonRef">
    <button
      type="button"
      class="select-field__trigger"
      :class="{ 'select-field__trigger--open': isOpen }"
      @click="toggle"
    >
      <span
        class="select-field__value"
        :class="{ 'select-field__value--placeholder': !selectedOption }"
        :style="selectedOption && optionStyle ? optionStyle(selectedOption) : null"
      >
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <ChevronDown :size="14" class="select-field__chevron" />
    </button>

    <Teleport to="body">
      <div v-if="isOpen" ref="popupRef" class="select-field__popup" :style="popupStyle">
        <template v-for="group in groups" :key="group.label ?? '_'">
          <span v-if="group.label" class="select-field__group-label">{{ group.label }}</span>
          <button
            v-for="option in group.options"
            :key="option.value"
            type="button"
            class="select-field__option"
            :class="{ 'select-field__option--active': option.value === modelValue }"
            :style="optionStyle ? optionStyle(option) : null"
            @click="select(option)"
          >
            <span class="select-field__option-label">{{ option.label }}</span>
            <Check v-if="option.value === modelValue" :size="13" class="select-field__option-check" />
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.select-field {
  width: 100%;

  &__trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-1);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--color-border-strong);
    }

    &--open {
      border-color: var(--color-accent);
    }
  }

  &__value {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--placeholder {
      color: var(--color-text-3);
    }
  }

  &__chevron {
    flex-shrink: 0;
    color: var(--color-text-3);
  }
}

.select-field__popup {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-1);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popup);
  overflow-y: auto;
}

.select-field__group-label {
  padding: var(--space-1) var(--space-2) 2px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-3);

  &:not(:first-child) {
    margin-top: var(--space-1);
  }
}

.select-field__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-1) var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-1);
  font-size: var(--text-xs);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-bg-3);
  }

  &--active {
    color: var(--color-accent);
  }
}

.select-field__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-field__option-check {
  flex-shrink: 0;
}
</style>
