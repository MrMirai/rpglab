import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/shared/composables/useApi'

// Папка на бэке (FolderResponse):
// { id, userId, userName, name, parentId|null, parentName|null, createdAt, childCount, children[] }
// Эндпоинты (см. API.md):
//   GET    /api/folders                 — плоский список ВСЕХ папок пользователя (без вложенности)
//   GET    /api/folders/{id}/children   — прямые дочерние папки
//   GET    /api/folders/{id}/path       — хлебные крошки от корня до папки включительно
//   POST   /api/folders                 { name, parentId? }  — создать (parentId null = корень)
//   PATCH  /api/folders/{id}            { name }             — переименовать
//   POST   /api/folders/{id}/move       { parentId }         — переместить (null = в корень)
//   DELETE /api/folders/{id}                                 — удалить (рекурсивно с содержимым)

export const useProjectsStore = defineStore('projects', () => {
  // ── Текущий сохранённый проект (задел под сохранение проектов токенов) ──
  const currentProjectId = ref(null)
  const currentProjectName = ref('Без названия')
  const isDirty = ref(false)
  const isSaving = ref(false)

  function setCurrentProject(id, name) {
    currentProjectId.value = id
    currentProjectName.value = name
    isDirty.value = false
  }

  function markDirty() {
    isDirty.value = true
  }

  // ── Папки проектов ──────────────────────────────────────────────────────
  // currentFolderId === null — корень (папки верхнего уровня, элемента «вверх» нет).
  const currentFolderId = ref(null)
  // Дочерние папки текущей папки (или корневые, если currentFolderId === null).
  const folders = ref([])
  // Хлебные крошки от корня до текущей папки: [{ id, name }, ...] (пусто в корне).
  const breadcrumbs = ref([])
  const foldersLoading = ref(false)
  const foldersError = ref(null)

  // parentId родителя текущей папки (для элемента «на уровень выше»).
  // null, если мы на первом уровне вложенности (родитель — корень).
  const parentFolderId = computed(() => {
    if (breadcrumbs.value.length < 2) return null
    return breadcrumbs.value[breadcrumbs.value.length - 2].id
  })

  // Загружает содержимое папки folderId (null — корень) + хлебные крошки.
  async function fetchFolders(folderId = null) {
    foldersLoading.value = true
    foldersError.value = null
    try {
      if (folderId === null) {
        // Корень: из плоского списка всех папок берём только верхнего уровня.
        const res = await api.get('/api/folders')
        if (!res.ok) throw new Error('Не удалось загрузить папки')
        const all = await res.json()
        folders.value = all.filter((f) => f.parentId == null)
        breadcrumbs.value = []
      } else {
        const [childrenRes, pathRes] = await Promise.all([
          api.get(`/api/folders/${folderId}/children`),
          api.get(`/api/folders/${folderId}/path`),
        ])
        if (!childrenRes.ok) throw new Error('Не удалось загрузить папки')
        folders.value = await childrenRes.json()
        breadcrumbs.value = pathRes.ok
          ? (await pathRes.json()).map((f) => ({ id: f.id, name: f.name }))
          : []
      }
      currentFolderId.value = folderId
    } catch (e) {
      foldersError.value = e.message
    } finally {
      foldersLoading.value = false
    }
  }

  // Перейти в папку и загрузить её содержимое.
  function openFolder(folderId) {
    return fetchFolders(folderId)
  }

  async function createFolder(name) {
    const res = await api.post('/api/folders', {
      name,
      parentId: currentFolderId.value,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось создать папку')
    }
    await fetchFolders(currentFolderId.value)
    return res.json().catch(() => null)
  }

  async function renameFolder(id, name) {
    const res = await api.patch(`/api/folders/${id}`, { name })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось переименовать папку')
    }
    const updated = await res.json().catch(() => null)
    // Правим локально, чтобы не дёргать полную перезагрузку из-за одного имени.
    const item = folders.value.find((f) => f.id === id)
    if (item) item.name = updated?.name ?? name
  }

  // Переместить папку id в папку targetParentId (null — в корень).
  async function moveFolder(id, targetParentId) {
    const res = await api.post(`/api/folders/${id}/move`, {
      parentId: targetParentId,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось переместить папку')
    }
    // Папка ушла из текущего списка — убираем её из текущего представления.
    folders.value = folders.value.filter((f) => f.id !== id)
    return res.json().catch(() => null)
  }

  async function deleteFolder(id) {
    const res = await api.delete(`/api/folders/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось удалить папку')
    }
    folders.value = folders.value.filter((f) => f.id !== id)
  }

  return {
    // проект
    currentProjectId,
    currentProjectName,
    isDirty,
    isSaving,
    setCurrentProject,
    markDirty,
    // папки
    currentFolderId,
    folders,
    breadcrumbs,
    parentFolderId,
    foldersLoading,
    foldersError,
    fetchFolders,
    openFolder,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
  }
})
