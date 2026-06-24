<script setup>
import { ref } from 'vue'
import { ArrowUp, ArrowDown, Maximize2, X } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useImageLoader } from '../composables/useImageLoader'
import { useBrushMask } from '../composables/useBrushMask'
import { useEditorBridge } from '../composables/useEditorBridge'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()
const { fillTop, fillBottom, fillAll, clear, redraw } = useBrushMask()
const bridge = useEditorBridge()

const maskFileInput = ref(null)

function triggerMaskUpload() { maskFileInput.value.click() }

async function onMaskFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const img = await loadFromFile(file)
  store.loadMaskImage(img)
  store.useCustomMask = true
}

function runPreset(type) {
  bridge.recordHistory() // снимок перед изменением маски
  if (type === 'top') fillTop()
  else if (type === 'bottom') fillBottom()
  else if (type === 'all') fillAll()
  else if (type === 'clear') clear()
  redraw()
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

    <p class="mask-controls__hint">
      Рисуй кистью на холсте где персонаж вылезает над рамкой.
      Инструмент «Восстановить» проявляет, «Стереть» убирает.
    </p>

    <div class="mask-controls__section-label">Быстрый старт</div>
    <div class="mask-controls__presets">
      <button class="preset-btn" @click="runPreset('top')">
        <ArrowUp :size="14" /> Верх
      </button>
      <button class="preset-btn" @click="runPreset('bottom')">
        <ArrowDown :size="14" /> Низ
      </button>
      <button class="preset-btn" @click="runPreset('all')">
        <Maximize2 :size="14" /> Всё
      </button>
      <button class="preset-btn danger" @click="runPreset('clear')">
        <X :size="14" /> Очистить
      </button>
    </div>

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
    line-height: var(--leading-normal);
    margin-bottom: var(--space-3);
  }

  &__section-label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  &__presets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
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

.preset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2);
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-border-strong);
    color: var(--color-text-1);
  }

  &.danger:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }
}
</style>
