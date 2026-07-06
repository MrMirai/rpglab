<script setup>
import { useSlots } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppPropertiesPanel from './AppPropertiesPanel.vue'

// Флаг авторизации пробрасывается в шапку пропом, чтобы shared-оболочка
// не зависела от модуля auth (значение даёт вид через useAuthStore).
defineProps({
  isAuthenticated: { type: Boolean, default: false },
})

const slots = useSlots()
</script>

<template>
  <div class="app-layout">
    <AppHeader class="layout-header" :is-authenticated="isAuthenticated">
      <!-- logo пробрасываем только если вид его задал, иначе остаётся дефолт в AppHeader -->
      <template v-if="slots['header-logo']" #logo><slot name="header-logo" /></template>
      <template #toolbar><slot name="header-toolbar" /></template>
      <template #actions><slot name="header-actions" /></template>
      <template v-if="slots['header-user']" #user><slot name="header-user" /></template>
    </AppHeader>
    <AppSidebar class="layout-sidebar">
      <slot name="sidebar" />
    </AppSidebar>
    <main class="layout-canvas">
      <slot />
    </main>
    <AppPropertiesPanel class="layout-properties">
      <slot name="properties" />
    </AppPropertiesPanel>
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
