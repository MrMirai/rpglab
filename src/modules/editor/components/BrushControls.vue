<script setup>
import { useEditorStore } from '../store'
import SliderControl from '@/shared/components/SliderControl.vue'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'

const store = useEditorStore()

const brushModes = [
  { value: 'restore', label: 'Восстановить' },
  { value: 'erase', label: 'Стереть' },
]

const lassoModes = [
  { value: 'add', label: 'Восстановить' },
  { value: 'subtract', label: 'Стереть' },
]
</script>

<template>
  <div class="brush-controls">
    <!-- Режим кисти: стереть или восстановить -->
    <template v-if="store.activeTool === 'brush'">
      <label class="brush-controls__label">Режим</label>
      <SegmentedControl
        class="brush-controls__modes"
        :model-value="store.brushMode"
        :options="brushModes"
        @update:model-value="store.setBrushMode($event)"
      />
      <SliderControl
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
      <SegmentedControl
        class="brush-controls__modes"
        :model-value="store.lassoMode"
        :options="lassoModes"
        @update:model-value="store.setLassoMode($event)"
      />
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
    margin-bottom: var(--space-3);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    line-height: 1.5;
  }
}
</style>
