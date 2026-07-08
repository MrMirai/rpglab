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

// Флаг «идёт обновление» + очередь запросов, ждущих новый токен
let isRefreshing = false
let refreshQueue = []

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

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token')

  const res = await fetch(resolveUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  })

  if (!res.ok) {
    setRefreshToken(null)
    setAccessToken(null)
    throw new Error('Refresh failed')
  }

  const data = await res.json()
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  return data.accessToken
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

  // 401 — пробуем обновить токен и повторить запрос
  if (res.status === 401 && getRefreshToken()) {
    if (isRefreshing) {
      // Обновление уже идёт — встаём в очередь
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject, path, options })
      })
    }

    isRefreshing = true
    try {
      const newToken = await refreshAccessToken()
      // Повторяем исходный запрос с новым токеном
      res = await fetch(resolveUrl(path), {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
      // Разбираем очередь ожидающих
      refreshQueue.forEach(({ resolve, path: p, options: o }) => resolve(apiFetch(p, o)))
    } catch (err) {
      refreshQueue.forEach(({ reject }) => reject(err))
      throw err
    } finally {
      isRefreshing = false
      refreshQueue = []
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
  delete: (path, opts) => apiFetch(path, { method: 'DELETE', ...opts }),
}
