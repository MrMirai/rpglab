<script setup>
import { useEditorStore } from '../store'
import SliderControl from './SliderControl.vue'

const store = useEditorStore()
</script>

<template>
  <div class="brush-controls">
    <!-- Режим кисти: стереть или восстановить -->
    <template v-if="store.activeTool === 'brush'">
      <label class="brush-controls__label">Режим</label>
      <div class="brush-controls__modes">
        <button
          :class="['mode-btn', { active: store.brushMode === 'restore' }]"
          @click="store.setBrushMode('restore')"
        >Восстановить</button>
        <button
          :class="['mode-btn', { active: store.brushMode === 'erase' }]"
          @click="store.setBrushMode('erase')"
        >Стереть</button>
      </div>
      <SliderControl
        style="margin-top: 1rem"
        label="Размер"
        :model-value="store.brushSize"
        :min="5" :max="200" :step="1" suffix="px"
        @update:model-value="store.brushSize = $event"
      />
      <SliderControl
        label="Жёсткость"
        :model-value="store.brushHardness"
        :min="0" :max="100" :step="1" suffix="%"
        @update:model-value="store.brushHardness = $event"
      />
    </template>

    <!-- Режим лассо: заливать (add) или вырезать (subtract) область в маске -->
    <template v-else-if="store.activeTool === 'lasso'">
      <label class="brush-controls__label">Режим лассо</label>
      <div class="brush-controls__modes">
        <button
          :class="['mode-btn', { active: store.lassoMode === 'add' }]"
          @click="store.setLassoMode('add')"
        >Восстановить</button>
        <button
          :class="['mode-btn', { active: store.lassoMode === 'subtract' }]"
          @click="store.setLassoMode('subtract')"
        >Стереть</button>
      </div>
      <p class="brush-controls__hint">
        Клик — точка, перетаскивание — сгладить дугу. Клик в первую точку или двойной клик — замкнуть.
        Enter — замкнуть и применить, Esc — отменить. Alt нажатием переключает режим.
      </p>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.brush-controls {
  padding: var(--space-3) var(--space-4);

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__modes {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    line-height: 1.5;
  }
}

.mode-btn {
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
