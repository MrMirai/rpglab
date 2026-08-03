<script setup>
import { ArrowUp, ArrowDown, Maximize2, X } from 'lucide-vue-next'
import { useBrushMask } from '../composables/useBrushMask'
import { useEditorBridge } from '../composables/useEditorBridge'
import BaseButton from '@/shared/components/BaseButton.vue'

// Маска окна рамки считается только автоматически (flood fill от углов кадра,
// см. useAutoMask). Загрузка своей маски убрана: авто-режим справляется, а
// ручной путь дублировал его и требовал от пользователя готовый PNG.
const { fillTop, fillBottom, fillAll, clear, redraw } = useBrushMask()
const bridge = useEditorBridge()

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
    <p class="mask-controls__hint">
      Рисуй кистью на холсте где персонаж вылезает над рамкой.
      Инструмент «Восстановить» проявляет, «Стереть» убирает.
    </p>

    <div class="mask-controls__section-label">Быстрый старт</div>
    <div class="mask-controls__presets">
      <BaseButton size="sm" @click="runPreset('top')">
        <ArrowUp :size="14" /> Верх
      </BaseButton>
      <BaseButton size="sm" @click="runPreset('bottom')">
        <ArrowDown :size="14" /> Низ
      </BaseButton>
      <BaseButton size="sm" @click="runPreset('all')">
        <Maximize2 :size="14" /> Всё
      </BaseButton>
      <BaseButton size="sm" danger-hover @click="runPreset('clear')">
        <X :size="14" /> Очистить
      </BaseButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mask-controls {
  padding: var(--space-3) var(--space-4);

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
</style>
