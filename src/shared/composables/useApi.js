// Базовый HTTP-клиент с авто-refresh access-токена.
// accessToken живёт в памяти, refreshToken — в localStorage (переживает перезагрузку).

// Бэк теперь сам настраивает CORS (разрешённый origin — см. API.md), поэтому
// дев-прокси Vite (/api → localhost:8080) больше не нужен — ходим напрямую.
const API_BASE_URL = 'http://localhost:8080'

function resolveUrl(path) {
  return path.startsWith('/api/') ? `${API_BASE_URL}${path}` : path
}

let accessToken = null

export function setAccessToken(token) {
  accessToken = token
}
export function getAccessToken() {
  return accessToken
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem('refreshToken', token)
  else localStorage.removeItem('refreshToken')
}
export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

export function clearTokens() {
  setAccessToken(null)
  setRefreshToken(null)
}

// Колбэк «сессия умерла» (401 от /refresh): его ставит приложение — сбрасывает
// пользователя в сторе и уводит на экран входа. useApi про роутер/стор не знает.
let onSessionExpired = null
export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn
}

// Троттлинг: сколько раз повторять запрос, отбитый рейт-лимитером
const RATE_LIMIT_RETRIES = 3

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Рейт-лимитер бэка отвечает строго 429 с заголовком Retry-After.
// (403 — это «чужой/системный ресурс», НЕ лимит, поэтому его не ретраим.)
function isRateLimited(res) {
  return res.status === 429
}

// /api/auth/* не ретраим автоматически: лимит там привязан к попыткам логина
// (10/IP, 15/email за 15 мин), и молчаливый повтор просто скрыл бы от пользователя,
// что он «сжигает» попытки. Вызывающий код (authStore) сам показывает Retry-After.
function isAuthPath(path) {
  return path.startsWith('/api/auth/')
}

// 401 на этих путях НЕ значит «протух access» и обновляться по нему бессмысленно:
// login — неверные креды, refresh/logout/register сами про токены. Обновление
// здесь дало бы лишний /refresh (и, при гонке, ложный «повторный» refresh → ресет).
// /api/auth/me в список НЕ входит: его 401 — обычное протухание access.
const NO_REFRESH_RETRY = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  // 401 здесь = «токен подтверждения неизвестен/использован/просрочен», а не
  // «протух access» (пользователь ещё гость, access-токена нет) — refresh не нужен.
  '/api/auth/verify-email',
]

// Single-flight обновление пары токенов.
//
// КРИТИЧНО: бэк РОТИРУЕТ refresh — каждый /api/auth/refresh гасит предъявленный
// токен и выдаёт НОВУЮ пару. Повторная отправка уже использованного refresh
// трактуется бэком как кража: он отзывает ВСЕ токены пользователя (разлогин со
// всех устройств). Отсюда два правила:
//   1) после ответа перезаписываем ОБА токена значениями из ответа;
//   2) обновление — одно на всех: параллельные 401 ждут один и тот же промис,
//      иначе второй ушёл бы со старым (только что погашенным) refresh → реюз → разлогин.
// Этот же промис переиспользует restoreSession() в authStore — чтобы восстановление
// сессии на старте и 401 от параллельного запроса не устроили два /refresh подряд.
let refreshPromise = null

export function refreshSession() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refresh = getRefreshToken()
    if (!refresh) throw new Error('No refresh token')

    const res = await fetch(resolveUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) throw new Error('Refresh failed')

    const data = await res.json()
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken) // ротация: старый refresh уже мёртв
    return data.accessToken
  })()
    .catch((err) => {
      // Сессия мертва (refresh протух/отозван/реюз) — чистим пару и уводим на вход.
      clearTokens()
      onSessionExpired?.()
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function apiFetch(path, options = {}, attempt = 0) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Для multipart не ставим Content-Type — браузер сам выставит с boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  let res = await fetch(resolveUrl(path), { ...options, headers })

  // 401 — access протух: обновляем пару (single-flight) и повторяем запрос ОДИН раз.
  if (res.status === 401 && getRefreshToken() && !NO_REFRESH_RETRY.includes(path)) {
    try {
      const newToken = await refreshSession()
      res = await fetch(resolveUrl(path), {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
    } catch {
      // Обновиться не удалось: refreshSession уже почистил токены и позвал
      // onSessionExpired (редирект на вход). Отдаём исходный 401 — вызывающий
      // код увидит !res.ok и не свалится на необработанном исключении.
      return res
    }
  }

  // Троттлинг: рейт-лимитер отбил запрос ДО обработки, поэтому повтор безопасен
  // даже для POST. Ждём с нарастающей задержкой (уважая Retry-After) и повторяем.
  // Это чинит «первый сейв падает 403, второй проходит»: аплоад+создание рамки
  // уходят пачкой и упираются в лимит — теперь клиент сам переждёт и повторит.
  if (attempt < RATE_LIMIT_RETRIES && !isAuthPath(path) && isRateLimited(res)) {
    const retryAfter = Number(res.headers.get('Retry-After'))
    const wait =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt
    await delay(wait)
    return apiFetch(path, options, attempt + 1)
  }

  return res
}

// Достаёт секунды ожидания из заголовка Retry-After 429-ответа (null, если его нет).
export function getRetryAfterSeconds(res) {
  const retryAfter = Number(res.headers.get('Retry-After'))
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
}

// Хелперы для типовых методов
export const api = {
  get: (path, opts) => apiFetch(path, { method: 'GET', ...opts }),
  post: (path, body, opts) =>
    apiFetch(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...opts,
    }),
  put: (path, body, opts) =>
    apiFetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...opts,
    }),
  patch: (path, body, opts) =>
    apiFetch(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...opts,
    }),
  delete: (path, opts) => apiFetch(path, { method: 'DELETE', ...opts }),
}
