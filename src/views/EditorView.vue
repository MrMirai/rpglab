<script setup>
import AppLayout from '@/shared/components/layout/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <div class="canvas-area">
      <span class="canvas-label">Canvas будет здесь</span>
    </div>
  </AppLayout>
</template>

<style lang="scss" scoped>
.canvas-area {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-2);
  background-image:
    linear-gradient(45deg, var(--color-bg-3) 25%, transparent 25%),
    linear-gradient(-45deg, var(--color-bg-3) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--color-bg-3) 75%),
    linear-gradient(-45deg, transparent 75%, var(--color-bg-3) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}

.canvas-label {
  font-size: var(--text-sm);
  color: var(--color-text-3);
  pointer-events: none;
}
</style>
