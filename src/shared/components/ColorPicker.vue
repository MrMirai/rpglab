<template>
  <div class="color-picker" ref="pickerRef">
    <!-- SV поле (насыщенность × яркость) -->
    <div
      class="color-picker__sv"
      ref="svRef"
      :style="{ background: `hsl(${hsv.h}, 100%, 50%)` }"
      @mousedown="onSvMousedown"
    >
      <!-- Белый градиент слева направо -->
      <div class="color-picker__sv-white" />
      <!-- Чёрный градиент снизу вверх -->
      <div class="color-picker__sv-black" />
      <!-- Маркер -->
      <div
        class="color-picker__sv-thumb"
        :style="{
          left: hsv.s * 100 + '%',
          top: (1 - hsv.v) * 100 + '%',
          background: currentHex,
        }"
      />
    </div>

    <!-- Hue слайдер -->
    <div class="color-picker__hue" ref="hueRef" @mousedown="onHueMousedown">
      <div class="color-picker__hue-thumb" :style="{ left: (hsv.h / 360) * 100 + '%' }" />
    </div>

    <!-- Превью + инпуты -->
    <div class="color-picker__inputs">
      <div class="color-picker__preview" :style="{ background: currentHex }" />
      <div class="color-picker__fields">
        <!-- Переключатель HEX/RGB -->
        <div class="color-picker__mode">
          <button
            v-for="m in ['HEX', 'RGB']"
            :key="m"
            :class="['mode-btn', { active: mode === m }]"
            @click="mode = m"
          >
            {{ m }}
          </button>
        </div>

        <!-- HEX -->
        <div v-if="mode === 'HEX'" class="color-picker__hex">
          <input
            class="color-picker__input"
            :value="hexInput"
            @input="onHexInput($event.target.value)"
            @blur="onHexBlur"
            maxlength="7"
            spellcheck="false"
          />
        </div>

        <!-- RGB -->
        <div v-else class="color-picker__rgb">
          <input
            class="color-picker__input color-picker__input--small"
            type="number"
            :value="rgb.r"
            min="0"
            max="255"
            @change="onRgbInput('r', $event.target.value)"
          />
          <input
            class="color-picker__input color-picker__input--small"
            type="number"
            :value="rgb.g"
            min="0"
            max="255"
            @change="onRgbInput('g', $event.target.value)"
          />
          <input
            class="color-picker__input color-picker__input--small"
            type="number"
            :value="rgb.b"
            min="0"
            max="255"
            @change="onRgbInput('b', $event.target.value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#c4954a' },
})
const emit = defineEmits(['update:modelValue'])

// --- Конвертеры ---

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

function rgbToHsv({ r, g, b }) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function hsvToRgb({ h, s, v }) {
  const f = (n) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  }
}

// --- Состояние ---

const hsv = ref(rgbToHsv(hexToRgb(props.modelValue)))
const mode = ref('HEX')
const hexInput = ref(props.modelValue)

const rgb = computed(() => hsvToRgb(hsv.value))
const currentHex = computed(() => rgbToHex(rgb.value))

// Синхронизация hexInput при изменении через SV/Hue
watch(currentHex, (val) => {
  hexInput.value = val
  emit('update:modelValue', val)
})

// Синхронизация если modelValue меняется снаружи
watch(
  () => props.modelValue,
  (val) => {
    if (val !== currentHex.value) {
      hsv.value = rgbToHsv(hexToRgb(val))
      hexInput.value = val
    }
  },
)

// --- SV поле ---
const svRef = ref(null)
let svDragging = false

function getSvFromEvent(e) {
  const rect = svRef.value.getBoundingClientRect()
  const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
  return { s, v }
}

function onSvMousedown(e) {
  svDragging = true
  const { s, v } = getSvFromEvent(e)
  hsv.value = { ...hsv.value, s, v }

  const onMove = (e) => {
    if (!svDragging) return
    const { s, v } = getSvFromEvent(e)
    hsv.value = { ...hsv.value, s, v }
  }
  const onUp = () => {
    svDragging = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// --- Hue слайдер ---
const hueRef = ref(null)

function getHueFromEvent(e) {
  const rect = hueRef.value.getBoundingClientRect()
  return Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360))
}

function onHueMousedown(e) {
  hsv.value = { ...hsv.value, h: getHueFromEvent(e) }

  const onMove = (e) => {
    hsv.value = { ...hsv.value, h: getHueFromEvent(e) }
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// --- HEX ввод ---
function onHexInput(val) {
  hexInput.value = val
  // Применяем только если валидный hex
  const clean = val.startsWith('#') ? val : '#' + val
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
    hsv.value = rgbToHsv(hexToRgb(clean))
  }
}

function onHexBlur() {
  // При потере фокуса — восстанавливаем валидное значение
  hexInput.value = currentHex.value
}

// --- RGB ввод ---
function onRgbInput(channel, val) {
  const current = hsvToRgb(hsv.value)
  current[channel] = Math.max(0, Math.min(255, parseInt(val) || 0))
  hsv.value = rgbToHsv(current)
}
</script>

<style lang="scss" scoped>
.color-picker {
  width: 220px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  overflow: hidden;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  user-select: none;

  // SV поле
  &__sv {
    position: relative;
    width: 100%;
    height: 140px;
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: crosshair;
  }

  &__sv-white {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, #fff, transparent);
  }

  &__sv-black {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, #000, transparent);
  }

  &__sv-thumb {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.4),
      0 2px 4px rgba(0, 0, 0, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  // Hue слайдер
  &__hue {
    position: relative;
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
    cursor: pointer;
  }

  &__hue-thumb {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
    background: transparent;
  }

  // Инпуты
  &__inputs {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__preview {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__mode {
    display: flex;
    gap: 2px;
  }

  &__hex,
  &__rgb {
    display: flex;
    gap: var(--space-1);
  }

  &__input {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-1);
    outline: none;
    font-family: var(--font-mono);

    &:focus {
      border-color: var(--color-accent);
    }

    &--small {
      width: 40px;
      text-align: center;
      padding: var(--space-1) 4px;
      // убираем стрелки
      -moz-appearance: textfield;
      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        display: none;
      }
    }
  }
}

.mode-btn {
  flex: 1;
  padding: 2px 4px;
  font-size: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}
</style>
