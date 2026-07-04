<script setup>
import { RouterLink } from 'vue-router'
import { Save, FolderOpen } from 'lucide-vue-next'

// Общий каркас шапки: логотип + постоянные действия (Сохранить/Проекты).
// Специфичный для редактора инструментарий и действия приходят через слоты,
// чтобы шапку могли переиспользовать разные редакторы (токены, раздатки).
</script>

<template>
  <header class="app-header">
    <div class="logo">
      <!-- Слот под переключатель редакторов (планируется выпадающий список) -->
      <slot name="logo">
        <span class="logo-icon">◎</span>
        <span class="logo-text">RPGLab</span>
      </slot>
    </div>

    <nav class="toolbar">
      <slot name="toolbar" />
    </nav>

    <div class="actions">
      <!-- Действия конкретного редактора (например, Экспорт) -->
      <slot name="actions" />
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

// Контейнер под инструментарий редактора (наполняется через слот toolbar)
.toolbar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
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
