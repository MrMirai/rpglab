import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/shared/composables/useApi'
import { useEditorSnapshot } from '@/modules/editor'
import { serializeProject } from './composables/useProjectSerializer.js'
import { deserializeProject } from './composables/useProjectDeserializer.js'

// Папка на бэке (FolderResponse):
// { id, userId, userName, name, parentId|null, parentName|null, createdAt, childCount, children[] }
// Эндпоинты (см. API.md):
//   GET    /api/folders                 - плоский список ВСЕХ папок пользователя (без вложенности)
//   GET    /api/folders/{id}/children   - прямые дочерние папки
//   GET    /api/folders/{id}/path       - хлебные крошки от корня до папки включительно
//   POST   /api/folders                 { name, parentId? }  - создать (parentId null = корень)
//   PATCH  /api/folders/{id}            { name }             - переименовать
//   POST   /api/folders/{id}/move       { parentId }         - переместить (null = в корень)
//   DELETE /api/folders/{id}                                 - удалить (рекурсивно с содержимым)

// Проект (ProjectResponse):
// { id, name, folderId|null, folderName|null, projectType, schemaVersion,
//   previewAssetId|null, previewUrl|null, template, configuration, assets, createdAt, updatedAt }
// configuration - JSON-ОБЪЕКТ (не строка), непрозрачный для бэка: он не валидирует
// структуру, не подставляет дефолты и ничего не выбрасывает. Проверяет только что
// это объект, что внутри есть числовой schemaVersion >= 1 и что размер <= 1 МиБ.
// assets - СЛОВАРЬ { "<assetId>": { url, owner } } по всем ссылкам, найденным
// в configuration (поля assetId / *AssetId). Массива assetIds в запросах БОЛЬШЕ НЕТ -
// набор файлов бэк вычисляет из самого содержимого.
// Эндпоинты (см. docs/API.md бэкенда, раздел «Проекты»):
//   GET    /api/projects                    - все проекты пользователя
//   GET    /api/projects/{id}               - один проект
//   GET    /api/projects/folder/{folderId}  - проекты внутри папки (без вложенных)
//   POST   /api/projects                    { name, projectType, folderId?, configuration, previewAssetId?, template? }
//   PUT    /api/projects/{id}               то же без projectType; НЕпереданное поле = СБРОС
//   PATCH  /api/projects/{id}               частично; configuration заменяется целиком, null не выставить
//   POST   /api/projects/{id}/move          { folderId }  (null = в корень)
//   DELETE /api/projects/{id}               204

const PROJECT_TYPE_TOKEN = 'token'

export const useProjectsStore = defineStore('projects', () => {
  // ── Текущий сохранённый проект ──────────────────────────────────────────
  const currentProjectId = ref(null)
  const currentProjectName = ref('Без названия')
  // Папка, в которой проект лежит НА САМОМ ДЕЛЕ (не та, что открыта в списке):
  // PUT считает непереданный folderId сбросом в корень, поэтому при каждом
  // сохранении её надо передавать явно, иначе проект переедет.
  const currentProjectFolderId = ref(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  // configuration проекта в том виде, в каком он пришёл с сервера. База для
  // следующего сохранения: собирать содержимое с нуля нельзя - поля, которых эта
  // версия редактора не знает (сохранены другой версией), бэк вернул бы нетронутыми,
  // а мы бы их затёрли. Хранится ПОСЛЕ миграции - в актуальной версии схемы.
  const currentConfig = ref(null)

  function setCurrentProject(id, name, folderId = null) {
    currentProjectId.value = id
    currentProjectName.value = name
    currentProjectFolderId.value = folderId
    isDirty.value = false
  }

  function markDirty() {
    isDirty.value = true
  }

  // Сбрасывает привязку к сохранённому проекту (новый проект / выход из аккаунта):
  // дальше «Сохранить» создаст новый, а не перезапишет чужой.
  function resetCurrentProject() {
    currentProjectId.value = null
    currentProjectName.value = 'Без названия'
    currentProjectFolderId.value = null
    currentConfig.value = null
    isDirty.value = false
  }

  // ── Папки проектов ──────────────────────────────────────────────────────
  // currentFolderId === null - корень (папки верхнего уровня, элемента «вверх» нет).
  const currentFolderId = ref(null)
  // Дочерние папки текущей папки (или корневые, если currentFolderId === null).
  const folders = ref([])
  // Хлебные крошки от корня до текущей папки: [{ id, name }, ...] (пусто в корне).
  const breadcrumbs = ref([])
  const foldersLoading = ref(false)
  const foldersError = ref(null)

  // parentId родителя текущей папки (для элемента «на уровень выше»).
  // null, если мы на первом уровне вложенности (родитель - корень).
  const parentFolderId = computed(() => {
    if (breadcrumbs.value.length < 2) return null
    return breadcrumbs.value[breadcrumbs.value.length - 2].id
  })

  // Загружает содержимое папки folderId (null - корень) + хлебные крошки.
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

  // Переместить папку id в папку targetParentId (null - в корень).
  async function moveFolder(id, targetParentId) {
    const res = await api.post(`/api/folders/${id}/move`, {
      parentId: targetParentId,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось переместить папку')
    }
    // Папка ушла из текущего списка - убираем её из текущего представления.
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

  // ── Проекты ─────────────────────────────────────────────────────────────
  const projects = ref([])
  const projectsLoading = ref(false)
  const projectsError = ref(null)

  async function readError(res, fallback) {
    const data = await res.json().catch(() => ({}))
    return new Error(data.message || fallback)
  }

  // Заливка файла в хранилище. type - строчный snake_case и передаётся
  // QUERY-параметром, а не полем формы (бэк биндит его через @RequestParam;
  // в теле формы он даёт MethodArgumentTypeMismatchException). Возвращает
  // { id, url, type }; повторная заливка того же файла тем же пользователем
  // вернёт существующий id (дедупликация по хешу).
  // Близнец есть в modules/frames/store.js - модули не тянут стор друг друга.
  async function uploadAsset(file, type) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post(`/api/assets?type=${encodeURIComponent(type)}`, form)
    if (!res.ok) throw await readError(res, 'Не удалось загрузить файл')
    return res.json()
  }

  // Список проектов: в папке folderId или (null) все проекты пользователя.
  // Отдельного эндпоинта «в корне» нет - корневые отбираем из общего списка.
  async function fetchProjects(folderId = null) {
    projectsLoading.value = true
    projectsError.value = null
    try {
      const res = await api.get(
        folderId === null ? '/api/projects' : `/api/projects/folder/${folderId}`,
      )
      if (!res.ok) throw await readError(res, 'Не удалось загрузить проекты')
      const list = await res.json()
      projects.value = folderId === null ? list.filter((p) => p.folderId == null) : list
    } catch (e) {
      projectsError.value = e.message
    } finally {
      projectsLoading.value = false
    }
  }

  async function fetchProject(id) {
    const res = await api.get(`/api/projects/${id}`)
    if (!res.ok) throw await readError(res, 'Не удалось открыть проект')
    return res.json()
  }

  async function createProject({
    name,
    configuration,
    folderId = null,
    projectType = PROJECT_TYPE_TOKEN,
    previewAssetId = null,
    template = false,
  }) {
    const res = await api.post('/api/projects', {
      name,
      projectType,
      folderId,
      configuration,
      previewAssetId,
      template,
    })
    if (!res.ok) throw await readError(res, 'Не удалось создать проект')
    return res.json()
  }

  // PUT - полная замена: НЕпереданное необязательное поле означает СБРОС
  // (folderId → корень, previewAssetId → превью удаляется, template → false).
  // Поэтому передавать нужно всё, что должно сохраниться, а не только изменённое.
  async function updateProject(id, { name, configuration, folderId = null, previewAssetId = null, template = false }) {
    const res = await api.put(`/api/projects/${id}`, {
      name,
      folderId,
      configuration,
      previewAssetId,
      template,
    })
    if (!res.ok) throw await readError(res, 'Не удалось сохранить проект')
    return res.json()
  }

  // PATCH - только переданные поля. Сбросить значение в null нельзя (для этого
  // PUT), а configuration заменяется ЦЕЛИКОМ: глубокого слияния бэк не делает,
  // присылать нужно полное содержимое.
  async function patchProject(id, patch) {
    const res = await api.patch(`/api/projects/${id}`, patch)
    if (!res.ok) throw await readError(res, 'Не удалось изменить проект')
    const updated = await res.json()
    const item = projects.value.find((p) => p.id === id)
    if (item) Object.assign(item, updated)
    if (currentProjectId.value === id) currentProjectName.value = updated.name
    return updated
  }

  function renameProject(id, name) {
    return patchProject(id, { name })
  }

  async function moveProject(id, targetFolderId) {
    const res = await api.post(`/api/projects/${id}/move`, { folderId: targetFolderId })
    if (!res.ok) throw await readError(res, 'Не удалось переместить проект')
    // Проект ушёл из текущего списка - убираем из представления.
    projects.value = projects.value.filter((p) => p.id !== id)
    if (currentProjectId.value === id) currentProjectFolderId.value = targetFolderId ?? null
    return res.json()
  }

  async function deleteProject(id) {
    const res = await api.delete(`/api/projects/${id}`)
    if (!res.ok) throw await readError(res, 'Не удалось удалить проект')
    projects.value = projects.value.filter((p) => p.id !== id)
    if (currentProjectId.value === id) resetCurrentProject()
  }

  // ── Пайплайн сохранения/открытия проекта токена ─────────────────────────

  // Сохраняет текущее состояние редактора. Порядок из docs/API.md: сначала
  // заливаются картинки, у которых ещё нет assetId (этим занимается сериализатор),
  // и только потом уходит содержимое со ссылками на них.
  async function saveTokenProject({ name, folderId = null } = {}) {
    const { getSnapshot, commitAssetIds } = useEditorSnapshot()
    const snapshot = getSnapshot()

    isSaving.value = true
    try {
      const configuration = await serializeProject(snapshot, {
        uploadAsset,
        baseConfig: currentConfig.value,
      })

      const projectName = name ?? currentProjectName.value
      const saved = currentProjectId.value
        ? await updateProject(currentProjectId.value, {
            name: projectName,
            configuration,
            // Своя папка проекта, а не открытая в списке: иначе PUT утащил бы
            // проект туда, куда пользователь просто зашёл посмотреть.
            folderId: folderId ?? currentProjectFolderId.value,
          })
        : await createProject({
            name: projectName,
            configuration,
            folderId: folderId ?? currentFolderId.value,
          })

      // Ссылки, выданные сервером, возвращаются в редактор: следующее сохранение
      // не будет заново растеризовать и заливать те же самые картинки.
      commitAssetIds({
        char: configuration.character.assetId,
        frame: configuration.frame.frameAssetId,
        bg: configuration.background.imageAssetId,
        brushMask: configuration.mask.brushMaskAssetId,
        brushVersion: snapshot.brushVersion,
      })

      currentConfig.value = configuration
      setCurrentProject(saved.id, saved.name, saved.folderId ?? null)
      return saved
    } finally {
      isSaving.value = false
    }
  }

  // Открывает проект в редакторе. Возвращает { project, missingAssets } -
  // список слотов, чьи файлы не нашлись в словаре assets (файл потерян);
  // это не ошибка открытия, слот просто останется пустым.
  async function openTokenProject(id) {
    const project = await fetchProject(id)
    const { applySnapshot } = useEditorSnapshot()
    const { snapshot, config, missingAssets } = await deserializeProject(project)

    applySnapshot(snapshot)
    currentConfig.value = config
    setCurrentProject(project.id, project.name, project.folderId ?? null)
    return { project, missingAssets }
  }

  return {
    // проект
    currentProjectId,
    currentProjectName,
    currentProjectFolderId,
    currentConfig,
    isDirty,
    isSaving,
    setCurrentProject,
    resetCurrentProject,
    markDirty,
    // CRUD проектов
    projects,
    projectsLoading,
    projectsError,
    uploadAsset,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    patchProject,
    renameProject,
    moveProject,
    deleteProject,
    saveTokenProject,
    openTokenProject,
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
