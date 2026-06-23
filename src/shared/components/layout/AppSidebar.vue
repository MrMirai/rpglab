<script setup>
import { ref } from 'vue'

const activeFrame = ref(0)
const frames = Array.from({ length: 6 }, (_, i) => ({ id: i, name: `Рамка ${i + 1}` }))
</script>

<template>
  <aside class="app-sidebar">
    <div class="sidebar-header">
      <h4>Рамки</h4>
    </div>

    <div class="frames-grid">
      <button
        v-for="frame in frames"
        :key="frame.id"
        class="frame-card"
        :class="{ active: activeFrame === frame.id }"
        @click="activeFrame = frame.id"
      />
    </div>

    <div class="sidebar-footer">
      <button class="upload-btn">＋ Загрузить рамку</button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.app-sidebar {
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--color-bg-2);
  border-right: 1px solid var(--color-border);
}

.sidebar-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;

  h4 {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--space-3);
  }
}

.frames-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-3);
  align-content: start;
}

.frame-card {
  aspect-ratio: 1 / 1;
  width: 100%;
  background-color: var(--color-bg-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
  }

  &.active {
    border-color: var(--color-accent);
    background-color: var(--color-accent-muted);
  }
}

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.upload-btn {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}
</style>
