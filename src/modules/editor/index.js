// Публичный API модуля editor.
// Внешние потребители (shared/, другие модули, views/) импортируют ТОЛЬКО отсюда,
// а не из внутренних путей store.js / composables/ / components/.

// Стор
export { useEditorStore } from './store.js'

// Composables
export { useEditorBridge } from './composables/useEditorBridge.js'
export { useImageLoader } from './composables/useImageLoader.js'
export { useExport } from './composables/useExport.js'
export { useBrushMask } from './composables/useBrushMask.js'
export { useAutoMask } from './composables/useAutoMask.js'
export { useEditorSnapshot } from './composables/useEditorSnapshot.js'

// Компоненты
export { default as EditorCanvas } from './components/EditorCanvas.vue'
export { default as EditorToolbar } from './components/EditorToolbar.vue'
export { default as EditorHeaderActions } from './components/EditorHeaderActions.vue'
export { default as EditorProperties } from './components/EditorProperties.vue'
export { default as ExportModal } from './components/ExportModal.vue'
export { default as PreviewWindow } from './components/PreviewWindow.vue'
