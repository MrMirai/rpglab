<template>
  <div ref="buttonRef" class="color-field" :class="{ 'is-open': isOpen }">
    <button
      type="button"
      class="color-field__swatch"
      :style="{ background: modelValue }"
      title="Открыть палитру"
      @click="toggle"
    />
    <!-- HEX правится прямо в поле: за точечной правкой цвета открывать палитру
         каждый раз незачем. Пока поле в фокусе, значение снаружи не перетираем
         (draft), иначе на полпути ввода курсор прыгал бы. -->
    <input
      class="color-field__input"
      :value="editing ? draft : modelValue"
      spellcheck="false"
      autocomplete="off"
      @focus="onFocus"
      @input="onInput"
      @change="onCommit"
      @keydown.enter="onCommit"
      @keydown.esc="onCancel"
      @blur="onBlur"
    />

    <!-- Попап с пикером -->
    <Teleport to="body">
      <div v-if="isOpen" ref="popupRef" class="color-field__popup" :style="popupStyle">
        <ColorPicker
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ColorPicker from './ColorPicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '#000000' },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const buttonRef = ref(null)
const popupRef = ref(null)
const popupStyle = ref({})

const POPUP_W = 220
const POPUP_H = 330

// --- Ручной ввод HEX ---
const editing = ref(false)
const draft = ref('')

// Принимаем #rgb/#rrggbb в любом регистре и без решётки - её дописываем сами
function normalizeHex(raw) {
  const v = raw.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(v)) return null
  if (v.length === 3) return '#' + v.split('').map((c) => c + c).join('').toLowerCase()
  if (v.length === 6) return '#' + v.toLowerCase()
  return null
}

function onFocus(e) {
  editing.value = true
  draft.value = props.modelValue
  e.target.select()
}

function onInput(e) {
  draft.value = e.target.value
}

function onCommit(e) {
  const hex = normalizeHex(draft.value)
  if (hex) emit('update:modelValue', hex)
  else draft.value = props.modelValue // мусор - откатываем к текущему цвету
  editing.value = false
  e.target.blur?.()
}

function onCancel(e) {
  draft.value = props.modelValue
  editing.value = false
  e.target.blur()
}

function onBlur() {
  if (!editing.value) return
  const hex = normalizeHex(draft.value)
  if (hex) emit('update:modelValue', hex)
  editing.value = false
}

function toggle() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const viewH = window.innerHeight
  const viewW = window.innerWidth
  const margin = 8

  let top
  if (rect.bottom + POPUP_H + margin > viewH) {
    top = rect.top - POPUP_H - margin
  } else {
    top = rect.bottom + margin
  }

  let left = rect.left
  if (left + POPUP_W > viewW - margin) {
    left = viewW - POPUP_W - margin
  }
  if (left < margin) left = margin

  popupStyle.value = {
    position: 'fixed',
    top: Math.round(Math.max(margin, top)) + 'px',
    left: Math.round(left) + 'px',
    zIndex: 2000,
  }
}

// Закрыть при клике вне кнопки и вне попапа (попап в body через Teleport)
function onClickOutside(e) {
  if (!isOpen.value) return
  if (buttonRef.value?.contains(e.target)) return
  if (popupRef.value?.contains(e.target)) return
  isOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<style lang="scss" scoped>
// Поле цвета = свотч + редактируемый HEX в одной рамке. Габариты совпадают
// с NumberField (высота 22px, прозрачная рамка, подсветка на hover/focus),
// чтобы строки свойств в обоих редакторах стояли по одной сетке.
.color-field {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 22px;
  // Ширина по содержимому: hex - значение фиксированной длины, растянутое
  // на всю строку поле выглядело бы пустым наполовину
  width: 104px;
  flex-shrink: 0;
  padding: 0 var(--space-1) 0 3px;
  background: var(--color-bg-1);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast);

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus-within,
  &.is-open {
    border-color: var(--color-accent);
  }

  &__popup {
    // Фон/рамку/радиус задаёт сам ColorPicker - здесь только тень попапа
    box-shadow: var(--shadow-popup);
    border-radius: var(--radius-lg);
  }

  &__swatch {
    width: 16px;
    height: 16px;
    padding: 0;
    flex-shrink: 0;
    border-radius: 2px;
    // Светлый свотч на светлом фоне иначе сливается с рамкой поля
    border: 1px solid rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  &__input {
    width: 100%;
    min-width: 0;
    padding: 0;
    background: none;
    border: none;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: lowercase;

    &:focus {
      outline: none;
      color: var(--color-text-1);
    }
  }
}
</style>
