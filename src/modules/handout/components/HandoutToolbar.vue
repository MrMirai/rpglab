<script setup>
import { computed } from 'vue'
import {
  MousePointer2, Hand, Undo2, Redo2,
  BringToFront, SendToBack, ArrowUp, ArrowDown,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Grid3x3,
} from 'lucide-vue-next'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'

// Тулбар редактора раздаток (слот #header-toolbar):
// инструменты, история, z-порядок, выравнивание, сетка.
const store = useHandoutStore()
const history = useHandoutHistory()

const hasSelection = computed(() => store.selectedIds.length > 0)

const selectedElements = computed(() =>
  store.elements.filter((e) => store.selectedIds.includes(e.id) && !e.locked),
)

// Выравнивание активно при любом выделении (1 → по странице, ≥2 → друг относительно друга)
const canAlign = computed(() => selectedElements.value.length > 0)

function reorder(direction) {
  if (!hasSelection.value) return
  history.record(store)
  // Для top: применяем в порядке выделения; для bottom — в обратном,
  // чтобы взаимный порядок выбранных элементов сохранился.
  const ids = direction === 'bottom' ? [...store.selectedIds].reverse() : store.selectedIds
  ids.forEach((id) => store.reorderElement(id, direction))
}

// Выравнивание. Один элемент → относительно границ документа; несколько →
// относительно общего bounding box выделения (друг относительно друга).
function align(mode) {
  const els = selectedElements.value
  if (!els.length) return
  history.record(store)

  let minX, maxX, minY, maxY
  if (els.length === 1) {
    minX = 0; minY = 0
    maxX = store.document.width; maxY = store.document.height
  } else {
    minX = Math.min(...els.map((e) => e.x))
    maxX = Math.max(...els.map((e) => e.x + e.width))
    minY = Math.min(...els.map((e) => e.y))
    maxY = Math.max(...els.map((e) => e.y + e.height))
  }

  els.forEach((el) => {
    const patch = {}
    if (mode === 'left') patch.x = Math.round(minX)
    else if (mode === 'center') patch.x = Math.round(minX + (maxX - minX) / 2 - el.width / 2)
    else if (mode === 'right') patch.x = Math.round(maxX - el.width)
    else if (mode === 'top') patch.y = Math.round(minY)
    else if (mode === 'middle') patch.y = Math.round(minY + (maxY - minY) / 2 - el.height / 2)
    else if (mode === 'bottom') patch.y = Math.round(maxY - el.height)
    store.updateElement(el.id, patch)
  })
}
</script>

<template>
  <div class="handout-toolbar">
    <div class="handout-toolbar__group">
      <button
        class="handout-toolbar__btn"
        :class="{ active: store.activeTool === 'hand' }"
        @click="store.setActiveTool('hand')"
      >
        <span class="icon"><Hand :size="16" /></span>
        <span class="label">Рука</span>
      </button>
      <button
        class="handout-toolbar__btn"
        :class="{ active: store.activeTool === 'select' }"
        @click="store.setActiveTool('select')"
      >
        <span class="icon"><MousePointer2 :size="16" /></span>
        <span class="label">Выбор</span>
      </button>
    </div>

    <div class="handout-toolbar__divider" />

    <div class="handout-toolbar__group">
      <button class="handout-toolbar__btn" :disabled="!history.canUndo.value" @click="history.undo(store)">
        <span class="icon"><Undo2 :size="16" /></span>
        <span class="label">Отменить</span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!history.canRedo.value" @click="history.redo(store)">
        <span class="icon"><Redo2 :size="16" /></span>
        <span class="label">Повторить</span>
      </button>
    </div>

    <div class="handout-toolbar__divider" />

    <div class="handout-toolbar__group">
      <button class="handout-toolbar__btn" :disabled="!hasSelection" title="На передний план" @click="reorder('top')">
        <span class="icon"><BringToFront :size="16" /></span>
        <span class="label">Вперёд</span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!hasSelection" title="На задний план" @click="reorder('bottom')">
        <span class="icon"><SendToBack :size="16" /></span>
        <span class="label">Назад</span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!hasSelection" title="Выше" @click="reorder('up')">
        <span class="icon"><ArrowUp :size="16" /></span>
        <span class="label">Выше</span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!hasSelection" title="Ниже" @click="reorder('down')">
        <span class="icon"><ArrowDown :size="16" /></span>
        <span class="label">Ниже</span>
      </button>
    </div>

    <div class="handout-toolbar__divider" />

    <div class="handout-toolbar__group">
      <button class="handout-toolbar__btn" :disabled="!canAlign" title="По левому краю" @click="align('left')">
        <span class="icon"><AlignStartVertical :size="16" /></span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!canAlign" title="По центру" @click="align('center')">
        <span class="icon"><AlignCenterVertical :size="16" /></span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!canAlign" title="По правому краю" @click="align('right')">
        <span class="icon"><AlignEndVertical :size="16" /></span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!canAlign" title="По верхнему краю" @click="align('top')">
        <span class="icon"><AlignStartHorizontal :size="16" /></span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!canAlign" title="По середине" @click="align('middle')">
        <span class="icon"><AlignCenterHorizontal :size="16" /></span>
      </button>
      <button class="handout-toolbar__btn" :disabled="!canAlign" title="По нижнему краю" @click="align('bottom')">
        <span class="icon"><AlignEndHorizontal :size="16" /></span>
      </button>
    </div>

    <div class="handout-toolbar__divider" />

    <div class="handout-toolbar__group">
      <button class="handout-toolbar__btn" :class="{ active: store.showGrid }" @click="store.toggleGrid()">
        <span class="icon"><Grid3x3 :size="16" /></span>
        <span class="label">Сетка</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.handout-toolbar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;

  &__group {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  &__divider {
    width: 1px;
    height: 24px;
    background-color: var(--color-border-strong);
    margin: 0 var(--space-3);
    flex-shrink: 0;
  }

  &__btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    border: none;
    background: transparent;
    color: var(--color-text-2);
    cursor: pointer;
    font-size: var(--text-xs);
    transition: background var(--transition-fast), color var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--color-bg-3);
      color: var(--color-text-1);
    }

    &.active {
      background: var(--color-accent-muted);
      color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: none;
    }

    .icon { line-height: 1; }

    .label {
      font-size: var(--text-xs);
      color: inherit;
      white-space: nowrap;
    }
  }
}
</style>
