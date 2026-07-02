<script setup>
import { computed } from 'vue'
import { useEditorStore } from '../store'
import SliderControl from './SliderControl.vue'

const store = useEditorStore()
const scalePercent = computed(() => Math.round(store.charScale * 100))
</script>

<template>
  <div class="character-controls">
    <SliderControl
      label="Масштаб"
      :model-value="scalePercent"
      :min="5" :max="1000" :step="1" suffix="%"
      @update:model-value="store.setCharScale($event / 100)"
    />
    <SliderControl
      label="Смещение X"
      :model-value="store.charX"
      :min="-2000" :max="2000" :step="1" suffix="px"
      @update:model-value="store.setCharPosition($event, store.charY)"
    />
    <SliderControl
      label="Смещение Y"
      :model-value="store.charY"
      :min="-2000" :max="2000" :step="1" suffix="px"
      @update:model-value="store.setCharPosition(store.charX, $event)"
    />
  </div>
</template>

<style lang="scss" scoped>
.character-controls {
  padding: 0 var(--space-4) var(--space-3);
}
</style>
