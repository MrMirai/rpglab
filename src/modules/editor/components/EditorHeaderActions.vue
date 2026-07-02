<script setup>
import { Download } from 'lucide-vue-next'
import { useEditorStore } from '../store'

const store = useEditorStore()
</script>

<template>
  <button class="header-btn accent-outline" :disabled="!store.isReady" @click="store.openExportModal()">
    <Download :size="16" />
    <span>Экспорт</span>
  </button>
</template>

<style lang="scss" scoped>
.header-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.accent-outline {
    background: transparent;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);

    &:hover:not(:disabled) {
      background: var(--color-accent-muted);
    }
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
</style>
