<template>
  <div class="color-button" ref="buttonRef">
    <button
      class="color-button__swatch"
      :style="{ background: modelValue }"
      @click="toggle"
    />
    <span class="color-button__value">{{ modelValue }}</span>

    <!-- Попап с пикером -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="color-button__popup"
        :style="popupStyle"
        ref="popupRef"
      >
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
defineEmits(['update:modelValue'])

const isOpen = ref(false)
const buttonRef = ref(null)
const popupRef = ref(null)
const popupStyle = ref({})

const POPUP_W = 220
const POPUP_H = 330

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
.color-button {
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &__swatch {
    width: 24px; height: 24px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-strong);
    cursor: pointer;
    transition: transform var(--transition-fast);
    flex-shrink: 0;
    &:hover { transform: scale(1.1); }
  }

  &__value {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    font-family: var(--font-mono);
  }
}
</style>
