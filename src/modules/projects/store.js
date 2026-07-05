import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProjectsStore = defineStore('projects', () => {
  // Текущий сохранённый проект (null — редактируется несохранённый/локальный черновик)
  const currentProjectId = ref(null)
  const currentProjectName = ref('Без названия')
  const isDirty = ref(false)
  const isSaving = ref(false)

  function setCurrentProject(id, name) {
    currentProjectId.value = id
    currentProjectName.value = name
    isDirty.value = false
  }

  function markDirty() { isDirty.value = true }

  return {
    currentProjectId, currentProjectName, isDirty, isSaving,
    setCurrentProject, markDirty,
  }
})
