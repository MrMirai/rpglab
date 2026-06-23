<script setup>
import { ref } from 'vue'
import { useEditorStore } from '../store'
import { useImageLoader } from '../composables/useImageLoader'
import SliderControl from './SliderControl.vue'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()
const maskFileInput = ref(null)

function triggerMaskUpload() { maskFileInput.value.click() }

async function onMaskFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const img = await loadFromFile(file)
  store.loadMaskImage(img)
  store.useCustomMask = true
}
</script>

<template>
  <div class="mask-controls">
    <div class="mask-controls__toggle">
      <button
        :class="['toggle-btn', { active: !store.useCustomMask }]"
        @click="store.resetMask()"
      >Авто</button>
      <button
        :class="['toggle-btn', { active: store.useCustomMask }]"
        @click="triggerMaskUpload"
      >Загрузить</button>
    </div>

    <p v-if="!store.useCustomMask" class="mask-controls__hint">
      Маска генерируется автоматически из рамки
    </p>
    <p v-else-if="store.maskImage" class="mask-controls__hint">
      Кастомная маска загружена
    </p>
    <p v-else class="mask-controls__hint warning">
      Выбери PNG-файл маски
    </p>

    <div class="mask-controls__section-label">Граница вылезания</div>
    <SliderControl
      label="Позиция Y"
      :model-value="store.overflowY"
      :min="0" :max="100" :step="1" suffix="%"
      @update:model-value="store.overflowY = $event"
    />
    <SliderControl
      label="Мягкость"
      :model-value="store.overflowSoft"
      :min="0" :max="80" :step="1" suffix="px"
      @update:model-value="store.overflowSoft = $event"
    />

    <input
      ref="maskFileInput"
      type="file"
      accept="image/png"
      style="display: none"
      @change="onMaskFileChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.mask-controls {
  padding: var(--space-3) var(--space-4);

  &__toggle {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    margin-bottom: var(--space-3);

    &.warning {
      color: var(--color-accent);
    }
  }

  &__section-label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
    margin-top: var(--space-2);
  }
}

.toggle-btn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:hover:not(.active) {
    border-color: var(--color-border-strong);
    color: var(--color-text-1);
  }
}
</style>
