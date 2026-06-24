<script setup>
import { useEditorStore } from '../store'
import SliderControl from './SliderControl.vue'

const store = useEditorStore()
</script>

<template>
  <div class="brush-controls">
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
  </div>
</template>

<style lang="scss" scoped>
.brush-controls {
  padding: var(--space-3) var(--space-4);
}
</style>
