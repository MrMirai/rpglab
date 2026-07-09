// Публичный API модуля handout (редактор раздаточных материалов).
// Внешние потребители (views/, другие модули) импортируют ТОЛЬКО отсюда.

// Стор
export { useHandoutStore, SIZE_PRESETS } from './store.js'

// Composables
export { useHandoutHistory } from './composables/useHandoutHistory.js'
export { useHandoutExport } from './composables/useHandoutExport.js'
export { useHandoutBridge } from './composables/useHandoutBridge.js'
export { generateId, getElementDefaults, centerInViewport } from './composables/useHandoutElements.js'

// Компоненты
export { default as HandoutCanvas } from './components/HandoutCanvas.vue'
export { default as HandoutSidebar } from './components/HandoutSidebar.vue'
export { default as HandoutToolbar } from './components/HandoutToolbar.vue'
export { default as HandoutHeaderActions } from './components/HandoutHeaderActions.vue'
export { default as HandoutPropertiesPanel } from './components/HandoutPropertiesPanel.vue'
export { default as HandoutExportModal } from './components/HandoutExportModal.vue'
