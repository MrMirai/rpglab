import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  api,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  getRetryAfterSeconds,
  clearTokens,
  refreshSession,
} from '@/shared/composables/useApi'

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

  // Регистрация НЕ логинит пользователя: бэк создаёт аккаунт с emailVerified:false,
  // токены НЕ выдаёт и шлёт на почту письмо со ссылкой подтверждения. Ответ — профиль
  // (UserResponse). Вход открывается только после verify-email, поэтому здесь не пишем
  // токены и не зовём fetchMe — вызывающий экран ведёт на «Проверьте почту».
  async function register(email, username, password) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/register', { email, username, password })
      // Тело парсим безопасно: успешный 201 может прийти без тела/не-JSON —
      // тогда res.json() бросил бы и завис бы «успешный» путь. Ошибку читаем
      // из тела, только если оно есть.
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Ошибка регистрации')
      // data — профиль с emailVerified:false; наверх не отдаём, экран знает email сам
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // Подтверждение email по одноразовому токену из письма. При успехе бэк СРАЗУ
  // выдаёт пару токенов (auto-login) — сохраняем её и тянем профиль, как после login.
  // Токен одноразовый: экран /verify-email обязан дёрнуть это ОДИН раз (guard).
  async function verifyEmail(token) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/verify-email', { token })
      const data = await res.json()
      if (!res.ok) {
        // 401 — токен неизвестен / уже использован / просрочен (TTL 24ч)
        throw new Error(data.message || 'Ссылка подтверждения недействительна или устарела')
      }
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

  // Повторная отправка письма подтверждения. Бэк ВСЕГДА отвечает 202 (даже если
  // аккаунта нет или он уже подтверждён — анти-enumeration), поэтому по ответу
  // не различаем «найден/не найден». Есть cooldown ~60с — экран блокирует кнопку
  // таймером, чтобы пользователь не спамил. Ошибку наверх кидаем только на сбое сети.
  async function resendVerification(email) {
    const res = await api.post('/api/auth/verify-email/resend', { email })
    if (!res.ok) throw new Error('Не удалось отправить письмо. Попробуйте позже')
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const data = await res.json()
      if (!res.ok) {
        // 429 — рейт-лимит логина (10/IP, 15/email за 15 мин). Отдаём наверх
        // секунды из Retry-After: LoginView заводит по ним обратный отсчёт и
        // блокирует кнопку, вместо того чтобы дать пользователю «жечь» попытки.
        if (res.status === 429) {
          const seconds = getRetryAfterSeconds(res)
          const err = new Error(
            seconds
              ? `Слишком много попыток входа. Повторите через ${seconds} с`
              : 'Слишком много попыток входа. Попробуйте позже',
          )
          err.retryAfterSeconds = seconds
          throw err
        }
        // 403 на /login — это ИМЕННО «email не подтверждён» (пароль верный),
        // а не «неверные креды» (это 401). Помечаем флагом, чтобы LoginView увёл
        // на экран «Проверьте почту» с resend, а не написал «неверный пароль».
        if (res.status === 403) {
          const err = new Error('Подтвердите email, чтобы войти')
          err.emailNotVerified = true
          throw err
        }
        throw new Error(data.message || 'Неверный email или пароль')
      }
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

  // Локальный сброс сессии (без похода на бэк) — общий путь для logout и для
  // «сессия умерла» (401 от /refresh, см. setSessionExpiredHandler в main.js).
  function clearSession() {
    clearTokens()
    user.value = null
    lastFetchedAt.value = 0
  }

  async function logout() {
    const refresh = getRefreshToken()
    // Гасим refresh на бэке — иначе он живёт ещё 30 дней и остаётся валидным.
    // Идемпотентно (неизвестный токен тоже даёт 204); сбой сети не должен
    // помешать локальному выходу, поэтому чистим пару в любом случае.
    if (refresh) {
      try {
        await api.post('/api/auth/logout', { refreshToken: refresh })
      } catch {
        // сеть/бэк недоступны — выходим локально
      }
    }
    clearSession()
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

  // Промис завершения стартового восстановления сессии. Роутер-гард дожидается
  // его перед проверкой isAuthenticated, иначе холодный заход на защищённую
  // страницу (F5 / прямая ссылка) сработал бы ДО того, как restoreSession()
  // подтянул профиль, и выкинул бы залогиненного пользователя на /login (гонка).
  let sessionReadyResolve
  const sessionReady = new Promise((resolve) => {
    sessionReadyResolve = resolve
  })

  // Восстановление сессии при перезагрузке: по refreshToken из localStorage
  // получаем новую пару и подтягиваем профиль. Обновление идёт через общий
  // single-flight refreshSession() из useApi (НЕ собственный POST /refresh):
  // refresh ротируется, и два параллельных обновления послали бы один и тот же
  // токен дважды — бэк счёл бы это реюзом и отозвал все токены пользователя.
  async function restoreSession() {
    try {
      if (!getRefreshToken()) return
      await refreshSession()
      await fetchMe()
    } catch {
      // refreshSession уже почистил токены (сессия мертва) — просто остаёмся гостем
    } finally {
      // В любом исходе (восстановились / гость / нет токена) разблокируем гард.
      sessionReadyResolve()
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    register,
    verifyEmail,
    resendVerification,
    login,
    logout,
    clearSession,
    fetchMe,
    refreshProfileIfStale,
    refreshAvatarOnError,
    restoreSession,
    sessionReady,
  }
})
