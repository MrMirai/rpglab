<script setup>
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppPropertiesPanel from './AppPropertiesPanel.vue'
</script>

<template>
  <div class="app-layout">
    <AppHeader class="layout-header" />
    <AppSidebar class="layout-sidebar" />
    <main class="layout-canvas">
      <slot />
    </main>
    <AppPropertiesPanel class="layout-properties" />
  </div>
</template>

<style lang="scss" scoped>
.app-layout {
  display: grid;
  grid-template-rows: 48px 1fr;
  grid-template-columns: 240px 1fr 260px;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg-1);
}

.layout-header {
  grid-column: 1 / -1;
  grid-row: 1;
}

.layout-sidebar {
  grid-column: 1;
  grid-row: 2;
}

.layout-canvas {
  grid-column: 2;
  grid-row: 2;
  overflow: hidden;
}

.layout-properties {
  grid-column: 3;
  grid-row: 2;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}
</style>
