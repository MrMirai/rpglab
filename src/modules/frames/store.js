import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/shared/composables/useApi'

export const useFramesStore = defineStore('frames', () => {
  // [{ id, ownerId, name, frameAssetId, frameAssetUrl, backgroundAssetId, backgroundAssetUrl|null, tags, createdAt }]
  // frameAssetUrl/backgroundAssetUrl — presigned-ссылки (живут 15 мин, долгосрочно не кешировать).
  // ownerId — владелец шаблона; у встроенных (системных) рамок — фиксированный UUID
  // системного пользователя, который никогда не совпадёт с id текущего юзера.
  // ВАЖНО: tags в ответе GET /api/frames — массив ИМЁН тегов (["fantasy"]), а не id;
  // при создании (POST /api/frames) наоборот отправляются id из справочника tags ниже.
  const frames = ref([])
  const loading = ref(false)
  const error = ref(null)
  const saving = ref(false)

  // Справочник тегов — [{ id, name }], создаются только администратором.
  const tags = ref([])
  const tagsLoading = ref(false)

  async function fetchFrames() {
    loading.value = true
    error.value = null
    try {
      // GET /api/frames работает и без токена (только системные рамки),
      // с токеном добавляются собственные кастомные.
      const res = await api.get('/api/frames')
      if (!res.ok) throw new Error('Не удалось загрузить рамки')
      frames.value = await res.json()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // GET /api/tags — публичный, для бейджей выбора тегов в форме сохранения и фильтра галереи.
  async function fetchTags() {
    tagsLoading.value = true
    try {
      const res = await api.get('/api/tags')
      if (!res.ok) return
      tags.value = await res.json()
    } finally {
      tagsLoading.value = false
    }
  }

  // Универсальная загрузка файла в хранилище. type — строка бэка в snake_case
  // (frame_image / background_image / character_image / brush_mask), передаётся
  // query-параметром (бэк биндит его через @RequestParam, а не полем формы).
  // Возвращает { id, url, type }. Дедупликация на бэке: повторная заливка того же
  // файла вернёт существующий id.
  async function uploadAsset(file, type) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post(`/api/assets?type=${encodeURIComponent(type)}`, form)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось загрузить файл')
    }
    return res.json()
  }

  // Сохранение пресета рамки: грузим ассеты, затем создаём рамку по их id.
  // backgroundFile — опционален (фон-компаньон рамки).
  // tagIds — id тегов из справочника (целые числа), необязательно.
  async function createFrame({ name, frameFile, backgroundFile, tagIds = [] }) {
    saving.value = true
    error.value = null
    try {
      const frameAsset = await uploadAsset(frameFile, 'frame_image')
      let backgroundAssetId = null
      if (backgroundFile) {
        const bgAsset = await uploadAsset(backgroundFile, 'background_image')
        backgroundAssetId = bgAsset.id
      }
      const res = await api.post('/api/frames', {
        name,
        frameAssetId: frameAsset.id,
        backgroundAssetId,
        tags: tagIds,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Не удалось сохранить рамку')
      }
      const created = await res.json()
      await fetchFrames()
      return created
    } finally {
      saving.value = false
    }
  }

  async function deleteFrame(id) {
    const res = await api.delete(`/api/frames/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось удалить рамку')
    }
    frames.value = frames.value.filter((f) => f.id !== id)
  }

  return {
    frames,
    loading,
    error,
    saving,
    tags,
    tagsLoading,
    fetchFrames,
    fetchTags,
    createFrame,
    deleteFrame,
  }
})
