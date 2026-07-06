import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  api,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  getRetryAfterSeconds,
} from '@/shared/composables/useApi'

// /api/auth/login и /api/auth/register не ретраятся автоматически в apiFetch
// (см. isAuthPath) — при 429 кидаем ошибку с retryAfterSeconds, чтобы View
// мог показать пользователю живой обратный отсчёт вместо молчаливого зависания.
function authError(res, data, fallbackMessage) {
  if (res.status === 429) {
    const err = new Error(data.message || 'Слишком много попыток. Попробуйте позже.')
    err.retryAfterSeconds = getRetryAfterSeconds(res) ?? 60
    return err
  }
  return new Error(data.message || fallbackMessage)
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { id, email, username, planCode, admin, ... }
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.admin === true)

  async function register(email, username, password) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/register', { email, username, password })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(res, data, 'Ошибка регистрации')
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(res, data, 'Неверный email или пароль')
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
    restoreSession,
  }
})
