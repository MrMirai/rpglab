// Публичный API модуля projects

export { useProjectsStore } from './store.js'
export { serializeProject } from './composables/useProjectSerializer.js'
export { deserializeProject } from './composables/useProjectDeserializer.js'
export { SCHEMA_VERSION, createEmptyProject } from './schema/tokenProject.js'

// Компоненты навигации по папкам проектов (страница /projects)
export { default as FolderCard } from './components/FolderCard.vue'
export { default as FolderBreadcrumbs } from './components/FolderBreadcrumbs.vue'
export { default as CreateFolderModal } from './components/CreateFolderModal.vue'
