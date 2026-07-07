import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/composables/useApi'

export const useAdminStore = defineStore('admin', () => {
  const creating = ref(false)
  const error = ref(null)

  // POST /api/admin/frames — создать системную рамку. multipart/form-data,
  // отличается от обычного createFrame в modules/frames: файлы и метаданные
  // уходят одним запросом (не через /api/assets), поле backgroundImage
  // не отправляем вовсе, если фон не выбран (бэк трактует его как «нет фона»
  // только при отсутствии поля, а не при пустом значении).
  async function createSystemFrame({ name, frameImage, backgroundImage, tagIds = [] }) {
    creating.value = true
    error.value = null
    try {
      const form = new FormData()
      form.append('name', name)
      form.append('frameImage', frameImage)
      if (backgroundImage) form.append('backgroundImage', backgroundImage)
      tagIds.forEach((id) => form.append('tagIds', id))

      const res = await api.post('/api/admin/frames', form)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // 403 — роль admin отозвали в другой вкладке между загрузкой страницы и отправкой формы
        const message =
          res.status === 403
            ? 'Недостаточно прав. Возможно, роль администратора была отозвана.'
            : data.message || 'Не удалось создать рамку'
        throw new Error(message)
      }
      return await res.json()
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      creating.value = false
    }
  }

  // Управление справочником тегов. Само чтение (GET /api/tags) живёт
  // в modules/frames (useFramesStore.tags/fetchTags) — переиспользуется и
  // галереей, и админкой; здесь только мутации, доступные лишь администратору.
  const tagActionPending = ref(false)
  const tagActionError = ref(null)

  async function createTag(name) {
    tagActionPending.value = true
    tagActionError.value = null
    try {
      const res = await api.post('/api/admin/tags', { name })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 409 — тег с таким именем уже существует
        throw new Error(data.message || 'Не удалось создать тег')
      }
      return data
    } catch (e) {
      tagActionError.value = e.message
      throw e
    } finally {
      tagActionPending.value = false
    }
  }

  async function renameTag(id, name) {
    tagActionPending.value = true
    tagActionError.value = null
    try {
      const res = await api.put(`/api/admin/tags/${id}`, { name })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 404 — тег не найден, 409 — новое имя уже занято другим тегом
        throw new Error(data.message || 'Не удалось переименовать тег')
      }
      return data
    } catch (e) {
      tagActionError.value = e.message
      throw e
    } finally {
      tagActionPending.value = false
    }
  }

  async function deleteTag(id) {
    tagActionPending.value = true
    tagActionError.value = null
    try {
      const res = await api.delete(`/api/admin/tags/${id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Не удалось удалить тег')
      }
    } catch (e) {
      tagActionError.value = e.message
      throw e
    } finally {
      tagActionPending.value = false
    }
  }

  return {
    creating,
    error,
    createSystemFrame,
    tagActionPending,
    tagActionError,
    createTag,
    renameTag,
    deleteTag,
  }
})
