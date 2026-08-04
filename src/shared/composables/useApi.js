// Базовый HTTP-клиент с авто-refresh access-токена.
// ОБА токена - в localStorage: пара переживает перезагрузку вкладки и общая
// на все вкладки одного origin.

// Бэк теперь сам настраивает CORS (разрешённый origin - см. API.md), поэтому
// дев-прокси Vite (/api → localhost:8080) больше не нужен - ходим напрямую.
const API_BASE_URL = 'http://localhost:8080'

function resolveUrl(path) {
  return path.startsWith('/api/') ? `${API_BASE_URL}${path}` : path
}

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

// Считаем access протухшим за 30 с до реального exp: запрос ещё должен успеть
// долететь, да и часы клиента с сервером расходятся на секунды.
const ACCESS_EXPIRY_SKEW_MS = 30 * 1000

let accessToken = null
let accessExpiresAt = 0 // мс epoch, 0 = срок неизвестен

// exp из payload JWT. Access - подписанный JWT (refresh, наоборот, непрозрачная
// строка, см. API.md), так что срок жизни читается прямо на клиенте. Подпись НЕ
// проверяем: знать надо лишь одно - стоит ли вообще пробовать этот токен, решение
// о валидности всё равно за бэком. base64url ≠ base64, и в payload бывает кириллица,
// поэтому декодируем через TextDecoder, а не голым atob.
function readTokenExpiry(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0
  } catch {
    // Не JWT / битый токен - пусть его отбракует бэк своим 401
    return 0
  }
}

export function setAccessToken(token) {
  accessToken = token || null
  accessExpiresAt = token ? readTokenExpiry(token) : 0
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
  else localStorage.removeItem(ACCESS_TOKEN_KEY)
}
export function getAccessToken() {
  return accessToken
}

// Жив ли сохранённый access. По нему решаем, нужна ли вообще ротация refresh:
// каждая ротация оставляет строку в БД, а перезагрузок и вкладок много.
export function hasValidAccessToken() {
  return !!accessToken && accessExpiresAt - ACCESS_EXPIRY_SKEW_MS > Date.now()
}

// Подтянуть пару, которую мог обновить сосед по вкладке. Читаем именно из
// localStorage, а не полагаемся на событие 'storage': оно асинхронное и к моменту
// проверки могло ещё не долететь.
function syncAccessTokenFromStorage() {
  const stored = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (stored !== accessToken) {
    accessToken = stored
    accessExpiresAt = stored ? readTokenExpiry(stored) : 0
  }
  return accessToken
}

// Стартовое чтение: после перезагрузки access ещё может быть жив, и тогда
// восстановление сессии обойдётся без ротации refresh вовсе.
syncAccessTokenFromStorage()

// Соседняя вкладка обновила пару (или вышла) - подхватываем без своего /refresh.
// Событие 'storage' приходит только в ДРУГИЕ вкладки, поэтому эха не будет.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ACCESS_TOKEN_KEY) syncAccessTokenFromStorage()
  })
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
  else localStorage.removeItem(REFRESH_TOKEN_KEY)
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens() {
  setAccessToken(null)
  setRefreshToken(null)
}

// Колбэк «сессия умерла» (401 от /refresh): его ставит приложение - сбрасывает
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
// (403 - это «чужой/системный ресурс», НЕ лимит, поэтому его не ретраим.)
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
// login - неверные креды, refresh/logout/register сами про токены. Обновление
// здесь дало бы лишний /refresh (и, при гонке, ложный «повторный» refresh → ресет).
// /api/auth/me в список НЕ входит: его 401 - обычное протухание access.
const NO_REFRESH_RETRY = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  // 401 здесь = «токен подтверждения неизвестен/использован/просрочен», а не
  // «протух access» (пользователь ещё гость, access-токена нет) - refresh не нужен.
  '/api/auth/verify-email',
  // То же и для сброса пароля: 401 = «ссылка из письма недействительна/устарела»
  // (TTL 1 час, токен одноразовый). Обновлять access бессмысленно - эндпоинт
  // публичный и про access ничего не знает.
  '/api/auth/reset-password',
  '/api/auth/reset-password/validate',
]

// Single-flight обновление пары токенов - в ДВА яруса, внутри вкладки и между ними.
//
// КРИТИЧНО: бэк РОТИРУЕТ refresh - каждый /api/auth/refresh гасит предъявленный
// токен и выдаёт НОВУЮ пару. Повторная отправка уже использованного refresh
// трактуется бэком как кража: он отзывает ВСЕ токены пользователя (разлогин со
// всех устройств). Отсюда три правила:
//   1) после ответа перезаписываем ОБА токена значениями из ответа;
//   2) обновление - одно на вкладку: параллельные 401 ждут один и тот же промис,
//      иначе второй ушёл бы со старым (только что погашенным) refresh → реюз → разлогин;
//   3) обновление - одно на ВСЕ вкладки: refresh лежит в общем localStorage, поэтому
//      два одновременных 401 в разных вкладках прочитали бы один и тот же токен и
//      предъявили его дважды - тот же реюз. Замок - Web Locks (общий на origin),
//      и внутри него мы ещё раз перечитываем хранилище: если сосед уже провернул
//      ротацию, свой /refresh не нужен вовсе.
// Этот же промис переиспользует restoreSession() в authStore - чтобы восстановление
// сессии на старте и 401 от параллельного запроса не устроили два /refresh подряд.
let refreshPromise = null

const REFRESH_LOCK_NAME = 'rpglab-auth-refresh'

// Web Locks есть во всех целевых браузерах; на всякий случай (старый Safari,
// не-secure origin) деградируем до внутривкладочного single-flight.
function withRefreshLock(fn) {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) return fn()
  return navigator.locks.request(REFRESH_LOCK_NAME, fn)
}

// staleToken - access, с которым запрос словил 401. Нужен, чтобы отличить
// «сосед уже обновил пару, бери готовую» от «мой токен отозвали, хотя exp ещё
// не наступил»: во втором случае в хранилище лежит ровно тот же мёртвый токен,
// и обновляться всё-таки надо.
export function refreshSession(staleToken = null) {
  if (refreshPromise) return refreshPromise

  refreshPromise = withRefreshLock(async () => {
    const fresh = syncAccessTokenFromStorage()
    if (fresh && fresh !== staleToken && hasValidAccessToken()) return fresh

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
  })
    .catch((err) => {
      // Сессия мертва (refresh протух/отозван/реюз) - чистим пару и уводим на вход.
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

  // Для multipart не ставим Content-Type - браузер сам выставит с boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const sentToken = accessToken
  let res = await fetch(resolveUrl(path), { ...options, headers })

  // 401 - access протух: обновляем пару (single-flight) и повторяем запрос ОДИН раз.
  if (res.status === 401 && getRefreshToken() && !NO_REFRESH_RETRY.includes(path)) {
    try {
      // Отдаём токен, с которым словили 401: если соседняя вкладка успела обновить
      // пару, refreshSession вернёт её без похода на /refresh (см. staleToken).
      const newToken = await refreshSession(sentToken)
      res = await fetch(resolveUrl(path), {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
    } catch {
      // Обновиться не удалось: refreshSession уже почистил токены и позвал
      // onSessionExpired (редирект на вход). Отдаём исходный 401 - вызывающий
      // код увидит !res.ok и не свалится на необработанном исключении.
      return res
    }
  }

  // Троттлинг: рейт-лимитер отбил запрос ДО обработки, поэтому повтор безопасен
  // даже для POST. Ждём с нарастающей задержкой (уважая Retry-After) и повторяем.
  // Это чинит «первый сейв падает 403, второй проходит»: аплоад+создание рамки
  // уходят пачкой и упираются в лимит - теперь клиент сам переждёт и повторит.
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
  // DELETE с телом - редкость, но бывает: удаление аккаунта подтверждается
  // паролем в теле запроса (DELETE /api/auth/me). Без body заголовок
  // Content-Type всё равно уходит - бэку это не мешает.
  delete: (path, body, opts) =>
    apiFetch(path, {
      method: 'DELETE',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...opts,
    }),
}
