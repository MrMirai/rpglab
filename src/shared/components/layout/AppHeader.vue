<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Save, FolderOpen, MousePointer2, Eraser, Paintbrush, Undo2, Redo2, Grid3x3, Eye } from 'lucide-vue-next'

const activeTool = ref('move')
</script>

<template>
  <header class="app-header">
    <div class="logo">
      <span class="logo-icon">◎</span>
      <span class="logo-text">Tokenizer</span>
    </div>

    <nav class="toolbar">
      <div class="toolbar__group">
        <button class="toolbar__btn" :class="{ active: activeTool === 'move' }" @click="activeTool = 'move'">
          <span class="icon"><MousePointer2 :size="16" /></span>
          <span class="label">Двигать</span>
        </button>
        <button class="toolbar__btn" :class="{ active: activeTool === 'erase' }" @click="activeTool = 'erase'">
          <span class="icon"><Eraser :size="16" /></span>
          <span class="label">Стереть</span>
        </button>
        <button class="toolbar__btn" :class="{ active: activeTool === 'restore' }" @click="activeTool = 'restore'">
          <span class="icon"><Paintbrush :size="16" /></span>
          <span class="label">Восстановить</span>
        </button>
      </div>

      <div class="toolbar__divider" />

      <div class="toolbar__group">
        <button class="toolbar__btn">
          <span class="icon"><Undo2 :size="16" /></span>
          <span class="label">Отменить</span>
        </button>
        <button class="toolbar__btn">
          <span class="icon"><Redo2 :size="16" /></span>
          <span class="label">Повторить</span>
        </button>
      </div>

      <div class="toolbar__divider" />

      <div class="toolbar__group">
        <button class="toolbar__btn">
          <span class="icon"><Grid3x3 :size="16" /></span>
          <span class="label">Сетка</span>
        </button>
        <button class="toolbar__btn">
          <span class="icon"><Eye :size="16" /></span>
          <span class="label">Превью</span>
        </button>
      </div>
    </nav>

    <div class="actions">
      <button class="btn-save">
        <Save :size="16" />
        <span>Сохранить</span>
      </button>
      <RouterLink to="/projects" class="btn-projects">
        <FolderOpen :size="16" />
        <span>Проекты</span>
      </RouterLink>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-4);
  background-color: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
  user-select: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;

  &-icon {
    font-size: 20px;
    color: var(--color-accent);
    line-height: 1;
  }

  &-text {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-accent);
  }
}

.toolbar {
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

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  background-color: var(--color-accent);
  color: var(--color-bg-1);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-accent-hover);
  }
}

.btn-projects {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  background: transparent;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}
</style>
