import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setAccessToken, setRefreshToken, getRefreshToken } from '@/shared/composables/useApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { id, email, username, planCode, admin, ... }
  const loading = ref(false)
  const error = ref(null)

  // Когда в последний раз тянули профиль. avatarUrl в UserResponse —
  // presigned-ссылка MinIO (живёт 15 мин), поэтому при долгой сессии/возврате
  // на вкладку её надо освежать перефетчем профиля (refreshProfileIfStale).
  const lastFetchedAt = ref(0)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.admin === true)

  async function register(email, username, password) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/register', { email, username, password })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Ошибка регистрации')
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      await fetchMe()
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Неверный email или пароль')
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      await fetchMe()
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    setAccessToken(null)
    setRefreshToken(null)
    user.value = null
  }

  async function fetchMe() {
    const res = await api.get('/api/auth/me')
    if (!res.ok) return
    user.value = await res.json()
    lastFetchedAt.value = Date.now()
  }

  // Освежить профиль (и вместе с ним presigned avatarUrl), если данные
  // «застоялись». Зовётся при возврате фокуса на вкладку — presigned-ссылка
  // на аватар живёт 15 мин, за это время вкладка могла провисеть в фоне и
  // ссылка протухла бы, ломая <img>. Порог 10 мин < 15 мин TTL — обновляемся
  // с запасом до истечения, но не дёргаем API на каждое переключение вкладки.
  async function refreshProfileIfStale(maxAgeMs = 10 * 60 * 1000) {
    if (!user.value) return
    if (Date.now() - lastFetchedAt.value < maxAgeMs) return
    await fetchMe()
  }

  // Реакция на фактически протухшую presigned-ссылку аватара: <img @error>.
  // Если вкладка провисела активной >15 мин без visibilitychange, ссылка
  // истекает и картинка не грузится — тогда рефетчим профиль за свежей ссылкой.
  // Троттлим (не чаще раза в 30с), чтобы битая картинка не устроила шторм
  // запросов: если и НОВАЯ ссылка не загрузится (реально удалённый ассет,
  // сеть), @error сработает снова, но повторный fetchMe отсечётся по времени.
  let avatarRetryAt = 0
  async function refreshAvatarOnError() {
    if (!user.value?.avatarUrl) return
    if (Date.now() - avatarRetryAt < 30 * 1000) return
    avatarRetryAt = Date.now()
    await fetchMe()
  }

  // Восстановление сессии при перезагрузке: по refreshToken из localStorage
  // получаем новый accessToken и подтягиваем профиль.
  async function restoreSession() {
    const refresh = getRefreshToken()
    if (!refresh) return
    try {
      const res = await api.post('/api/auth/refresh', { refreshToken: refresh })
      if (!res.ok) {
        setRefreshToken(null)
        return
      }
      const data = await res.json()
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      await fetchMe()
    } catch {
      setRefreshToken(null)
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    register,
    login,
    logout,
    fetchMe,
    refreshProfileIfStale,
    refreshAvatarOnError,
    restoreSession,
  }
})
