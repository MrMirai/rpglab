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

  // Запрос письма со ссылкой сброса пароля. Как и resendVerification, бэк ВСЕГДА
  // отвечает 202 (даже если аккаунта с таким email нет — анти-enumeration), поэтому
  // по ответу не различаем «найден/не найден». Cooldown ~60с — экран блокирует кнопку
  // таймером. Ошибку наверх кидаем только на сбое сети/бэка.
  async function forgotPassword(email) {
    const res = await api.post('/api/auth/forgot-password', { email })
    if (!res.ok) throw new Error('Не удалось отправить письмо. Попробуйте позже')
  }

  // Проверка токена сброса ДО показа формы: бэк отвечает 204, если по ссылке ещё
  // можно менять пароль, и 401, если она неизвестна/уже использована/просрочена.
  // Токен при этом НЕ гасится (в отличие от reset-password) — зондировать им можно.
  // Три причины отказа бэк намеренно не различает (анти-enumeration), поэтому и
  // сообщение наверх одно на всех. Ошибки сети/5xx отдаём БЕЗ флага invalidToken:
  // экран из-за них не должен объявлять живую ссылку мёртвой.
  // Глобальные loading/error не трогаем — это фоновая проверка одного экрана.
  async function validateResetToken(token) {
    const res = await api.post('/api/auth/reset-password/validate', { token })
    if (res.ok) return
    if (res.status === 401) {
      const err = new Error('Ссылка уже использована или истёк срок её действия.')
      err.invalidToken = true
      throw err
    }
    throw new Error('Не удалось проверить ссылку')
  }

  // Установка нового пароля по одноразовому токену из письма (TTL 1 час).
  // ВАЖНО: пары токенов бэк тут НЕ выдаёт (в отличие от verify-email) — успешный
  // сброс гасит ВСЕ refresh-токены пользователя (выход со всех устройств), поэтому
  // локальную сессию тоже чистим и ведём на вход с новым паролем.
  async function resetPassword(token, newPassword) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/api/auth/reset-password', { token, newPassword })
      if (!res.ok) {
        // 204 приходит без тела, ошибки — с JSON; парсим безопасно
        const data = await res.json().catch(() => null)
        if (res.status === 401) {
          // Токен неизвестен / уже использован / просрочен — не «неверный пароль».
          // Экран по этому флагу предлагает запросить письмо заново.
          const err = new Error('Ссылка уже использована или истёк срок её действия.')
          err.invalidToken = true
          throw err
        }
        throw new Error(data?.message || 'Не удалось изменить пароль')
      }
      // Наши refresh-токены бэк только что отозвал — держать локальную пару нельзя.
      clearSession()
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

  // Безвозвратное удаление аккаунта со всем содержимым (рамки, проекты, папки,
  // файлы в хранилище, все сессии). Подтверждается ТЕКУЩИМ ПАРОЛЕМ в теле
  // запроса: одного перехваченного access-токена не должно хватать, чтобы стереть
  // аккаунт. 401 здесь = «пароль не совпал» (протухший access apiFetch уже
  // обновил бы и повторил запрос сам), поэтому вслепую разлогинивать нельзя —
  // экран подсвечивает поле пароля. После 204 logout НЕ зовём: refresh-токены
  // удалены вместе с аккаунтом, гасить нечего — просто чистим локальную пару.
  async function deleteAccount(password) {
    const res = await api.delete('/api/auth/me', { password })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        const err = new Error('Неверный пароль')
        err.invalidPassword = true
        throw err
      }
      throw new Error(data.message || 'Не удалось удалить аккаунт')
    }
    clearSession()
  }

  // Смена отображаемого имени (3–32 символа). На аутентификацию НЕ влияет:
  // логин идёт по email, username в токенах не участвует — перевыпускать пару
  // после смены не нужно, достаточно положить в стор профиль из ответа.
  // Отправка текущего имени конфликтом не считается — бэк вернёт 200 без изменений.
  async function updateUsername(username) {
    const res = await api.put('/api/auth/me/username', { username })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // 409 — имя занято другим пользователем: экран подсвечивает поле, а не
      // показывает общую ошибку (флагом отличаем от 400-валидации/сбоя).
      if (res.status === 409) {
        const err = new Error('Это имя уже занято')
        err.usernameTaken = true
        throw err
      }
      throw new Error(data.message || 'Не удалось изменить имя пользователя')
    }
    user.value = data
    // В ответе свежая presigned-ссылка на аватар — профиль «не застоялся»
    lastFetchedAt.value = Date.now()
  }

  // Загрузка ассета (type=avatar_image — query-параметр, бэк биндит его через
  // @RequestParam, а НЕ как поле multipart-формы) + привязка к профилю.
  // PUT возвращает обновлённый UserResponse — кладём его в user целиком.
  async function uploadAvatar(file) {
    const form = new FormData()
    form.append('file', file)
    const assetRes = await api.post('/api/assets?type=avatar_image', form)
    const assetData = await assetRes.json().catch(() => ({}))
    if (!assetRes.ok) throw new Error(assetData.message || 'Не удалось загрузить файл')

    const res = await api.put('/api/auth/me/avatar', { assetId: assetData.id })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Не удалось установить аватар')
    user.value = data
    // avatarUrl в ответе — свежая presigned-ссылка, значит профиль «не застоялся»
    lastFetchedAt.value = Date.now()
  }

  // DELETE отдаёт 204 без тела — новую версию профиля бэк не возвращает,
  // поэтому гасим avatarUrl локально патчем.
  async function removeAvatar() {
    const res = await api.delete('/api/auth/me/avatar')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Не удалось убрать аватар')
    }
    if (user.value) user.value = { ...user.value, avatarUrl: null }
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
    forgotPassword,
    validateResetToken,
    resetPassword,
    login,
    logout,
    clearSession,
    fetchMe,
    updateUsername,
    deleteAccount,
    uploadAvatar,
    removeAvatar,
    refreshProfileIfStale,
    refreshAvatarOnError,
    restoreSession,
    sessionReady,
  }
})
