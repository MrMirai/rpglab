// Публичный API модуля projects

export { useProjectsStore } from './store.js'
export { serializeProject } from './composables/useProjectSerializer.js'
export { deserializeProject } from './composables/useProjectDeserializer.js'
export { SCHEMA_VERSION, createEmptyProject, applyDefaults } from './schema/tokenProject.js'
export { migrate } from './schema/migrations.js'
export {
  HANDOUT_SCHEMA_VERSION,
  createEmptyHandoutProject,
  applyHandoutDefaults,
  migrateHandout,
} from './schema/handoutProject.js'

// Компоненты навигации по папкам проектов (страница /projects)
export { default as FolderCard } from './components/FolderCard.vue'
export { default as FolderBreadcrumbs } from './components/FolderBreadcrumbs.vue'
export { default as CreateFolderModal } from './components/CreateFolderModal.vue'

// Проекты
export { default as ProjectCard } from './components/ProjectCard.vue'
export { default as SaveProjectModal } from './components/SaveProjectModal.vue'
