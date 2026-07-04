<script setup>
import { MousePointer2, Eraser, Paintbrush, Hand, Undo2, Redo2, Grid3x3, Eye, Layers, Ghost, Spline } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useEditorBridge } from '../composables/useEditorBridge'

const store = useEditorStore()
const bridge = useEditorBridge()
</script>

<template>
  <div class="editor-toolbar">
    <div class="editor-toolbar__group">
      <button class="editor-toolbar__btn" :class="{ active: store.activeTool === 'hand' }"
        @click="store.setActiveTool('hand')">
        <span class="icon">
          <Hand :size="16" />
        </span>
        <span class="label">Рука</span>
      </button>
      <button class="editor-toolbar__btn" :class="{ active: store.activeTool === 'move' }"
        @click="store.setActiveTool('move')">
        <span class="icon">
          <MousePointer2 :size="16" />
        </span>
        <span class="label">Двигать</span>
      </button>
      <button class="editor-toolbar__btn" :class="{ active: store.activeTool === 'brush' }"
        @click="store.setActiveTool('brush')">
        <span class="icon">
          <Paintbrush :size="16" />
        </span>
        <span class="label">Кисть</span>
      </button>
      <button class="editor-toolbar__btn" :class="{ active: store.activeTool === 'lasso' }"
        @click="store.setActiveTool('lasso')">
        <span class="icon">
          <Spline :size="16" />
        </span>
        <span class="label">Лассо</span>
      </button>
    </div>

    <div class="editor-toolbar__divider" />

    <div class="editor-toolbar__group">
      <button class="editor-toolbar__btn" :disabled="!store.canUndo" @click="bridge.performUndo()">
        <span class="icon">
          <Undo2 :size="16" />
        </span>
        <span class="label">Отменить</span>
      </button>
      <button class="editor-toolbar__btn" :disabled="!store.canRedo" @click="bridge.performRedo()">
        <span class="icon">
          <Redo2 :size="16" />
        </span>
        <span class="label">Повторить</span>
      </button>
    </div>

    <div class="editor-toolbar__divider" />

    <div class="editor-toolbar__group">
      <button class="editor-toolbar__btn" :class="{ active: store.showGrid }" @click="store.toggleGrid()">
        <span class="icon">
          <Grid3x3 :size="16" />
        </span>
        <span class="label">Сетка</span>
      </button>
      <button class="editor-toolbar__btn" :class="{ active: store.previewMode }" @click="store.togglePreview()">
        <span class="icon">
          <Eye :size="16" />
        </span>
        <span class="label">Превью</span>
      </button>
      <button class="editor-toolbar__btn" :class="{ active: store.showMaskOverlay }" @click="store.toggleMaskOverlay()"
        title="Показать маску">
        <span class="icon">
          <Layers :size="16" />
        </span>
        <span class="label">Маска</span>
      </button>
      <button class="editor-toolbar__btn" :class="{ active: store.showHidden }" @click="store.toggleHidden()"
        title="Показать скрытые масками области персонажа">
        <span class="icon">
          <Ghost :size="16" />
        </span>
        <span class="label">Скрытое</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.editor-toolbar {
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

    &:hover {
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

    .icon {
      line-height: 1;
    }

    .label {
      font-size: var(--text-xs);
      color: inherit;
      white-space: nowrap;
    }
  }
}
</style>
