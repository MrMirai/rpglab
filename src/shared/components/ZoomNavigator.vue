<script setup>
import { Plus, Minus, Maximize } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

defineProps({
  zoom: { type: Number, default: 1 },
  minZoom: { type: Number, default: 0.1 },
  maxZoom: { type: Number, default: 8 },
})
defineEmits(['update:zoom', 'zoom-in', 'zoom-out', 'reset'])
</script>

<template>
  <div class="zoom-nav">
    <BaseButton size="sm" square @click="$emit('zoom-in')">
      <Plus :size="14" />
    </BaseButton>
    <div class="zoom-nav__slider-wrap">
      <input
        type="range"
        class="zoom-nav__slider"
        :min="minZoom"
        :max="maxZoom"
        :step="0.01"
        :value="zoom"
        orient="vertical"
        @input="$emit('update:zoom', Number($event.target.value))"
      />
    </div>
    <BaseButton size="sm" square @click="$emit('zoom-out')">
      <Minus :size="14" />
    </BaseButton>
    <BaseButton size="sm" square title="Сбросить приближение" @click="$emit('reset')">
      <Maximize :size="14" />
    </BaseButton>
    <span class="zoom-nav__label">{{ Math.round(zoom * 100) }}%</span>
  </div>
</template>

<style lang="scss" scoped>
.zoom-nav {
  position: absolute;
  right: var(--space-3);
  top: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  z-index: 10;
  user-select: none;

  &__slider-wrap {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__slider {
    writing-mode: vertical-lr;
    direction: rtl;
    width: 4px;
    height: 80px;
    appearance: none;
    background: var(--color-border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-accent);
      cursor: pointer;
    }
  }

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    font-variant-numeric: tabular-nums;
    min-width: 32px;
    text-align: center;
  }
}
</style>
