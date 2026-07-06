# RPGLab Backend — API Reference

**Base URL:** `http://localhost:8080`  
**Content-Type:** `application/json` (кроме загрузки файлов — `multipart/form-data`)

---

## Аутентификация

Stateless JWT, без сессий. Два токена:
- **access** — короткоживущий (15 минут), передаётся в каждом запросе
- **refresh** — долгоживущий (30 дней), только для обновления access

Передача access-токена:
```
Authorization: Bearer <accessToken>
```

Refresh-токен НЕ ротируется — `/auth/refresh` возвращает тот же refresh и новый access.

---

## Публичные эндпоинты (без токена)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Обновление access-токена |
| GET | `/api/frames` | Каталог рамок |
| GET | `/api/tags` | Справочник тегов |

Все остальные эндпоинты требуют валидный access-токен.

## Административные эндпоинты

🔒 Требуют токен пользователя с `admin: true`. При отсутствии роли — `403`.

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/admin/frames` | Создать системную рамку |
| POST | `/api/admin/tags` | Создать тег |
| PUT | `/api/admin/tags/{id}` | Переименовать тег |
| DELETE | `/api/admin/tags/{id}` | Удалить тег |

---

## `POST /api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "username": "myname",
  "password": "mypassword"
}
```

Ограничения: `username` — 3–32 символа, `password` — 8–128 символов.

**Response `201`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

## `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response `200`:** тот же `AuthResponse` (`accessToken` + `refreshToken`).

**Rate limit:** 10 попыток с одного IP / 15 попыток на один email за 15 минут. При превышении — `429` с заголовком `Retry-After: <секунды>`.

---

## `POST /api/auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`:** `AuthResponse` с новым access-токеном и тем же refresh.

---

## `GET /api/auth/me`

🔒 Требует токен.

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "myname",
  "admin": false,
  "planCode": "free",
  "billingPeriod": null,
  "subscriptionExpiresAt": null,
  "subscriptionActive": true,
  "createdAt": "2026-07-06T10:00:00Z",
  "avatarUrl": "https://..."
}
```

`billingPeriod` — `"monthly"` | `"yearly"` | `null` (free-план).  
`subscriptionExpiresAt` — `null` для free (бессрочно).  
`subscriptionActive` — всегда `true` для free, для платных — `now < subscriptionExpiresAt`.  
`avatarUrl` — временная presigned-ссылка, `null` если аватар не задан.

---

## `POST /api/assets` — загрузка файла

🔒 Требует токен.

**Request:** `multipart/form-data`

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `file` | binary | да | Файл |
| `type` | string | да | Тип ассета (см. ниже) |

**Допустимые значения `type`:**

| Значение | Назначение |
|----------|-----------|
| `character_image` | Изображение персонажа |
| `frame_image` | Картинка рамки |
| `background_image` | Фоновое изображение |
| `brush_mask` | Маска кисти |
| `avatar_image` | Аватар аккаунта |

**Response `201`:**
```json
{
  "id": "uuid",
  "url": "https://...",
  "type": "character_image"
}
```

`url` — временная presigned-ссылка. Отдаётся для немедленного отображения, не хранить постоянно.  
`id` — использовать при создании рамок и проектов.

Лимит файла: **60 MB** (при превышении — `413`).

Дедупликация по хешу: если пользователь загружает одинаковый файл повторно — возвращается тот же `id` (новый объект в S3 не создаётся).

---

## `PUT /api/auth/me/avatar` — установить аватар

🔒 Требует токен.

Сначала загрузить файл через `POST /api/assets` с `type=avatar_image`, затем передать полученный `assetId` сюда. Ассет должен принадлежать текущему пользователю. При смене аватара старый файл удаляется автоматически (best-effort).

**Request:**
```json
{
  "assetId": "uuid"
}
```

**Response `200`:** обновлённый `UserResponse` (см. выше, с новым `avatarUrl`).

---

## `DELETE /api/auth/me/avatar` — убрать аватар

🔒 Требует токен.

**Response `204`:** без тела.

---

## `GET /api/tags` — справочник тегов

Публичный. Возвращает все теги, отсортированные по имени.

**Response `200`:**
```json
[
  { "id": 1, "name": "fantasy" },
  { "id": 2, "name": "gold" }
]
```

`id` использовать в поле `tags` при создании рамки (`POST /api/frames`).

---

## `GET /api/frames` — каталог рамок

Публичный. Без токена — только системные рамки. С токеном — системные + личные рамки пользователя.

**Response `200`:** массив объектов:
```json
[
  {
    "id": "uuid",
    "ownerId": "uuid",
    "name": "Золотая рамка",
    "frameAssetId": "uuid",
    "frameAssetUrl": "https://...",
    "backgroundAssetId": "uuid",
    "backgroundAssetUrl": "https://...",
    "tags": ["fantasy", "gold"],
    "createdAt": "2026-07-06T10:00:00Z"
  }
]
```

`backgroundAssetId` / `backgroundAssetUrl` — `null`, если у рамки нет фона-компаньона.  
`ownerId` — для системных рамок это фиксированный UUID `00000000-0000-0000-0000-000000000000`, который никогда не совпадёт с реальным пользователем. Кнопку удаления показывать только если `ownerId === currentUser.id`.  
URL ассетов — временные presigned-ссылки, не кешировать.

---

## `POST /api/frames` — создать рамку

🔒 Требует токен.

**Request:**
```json
{
  "name": "Моя рамка",
  "frameAssetId": "uuid",
  "backgroundAssetId": "uuid",
  "tags": [1, 2]
}
```

`frameAssetId` — обязательно. Ассет должен принадлежать текущему пользователю.  
`backgroundAssetId` — необязательно (`null` если без фона).  
`tags` — необязательно, массив `id` тегов из справочника (целые числа). Теги создаются только администратором — если тег с таким id не существует, придёт `404`.

**Response `201`:** тот же объект `FrameResponse` (см. выше).

---

## `DELETE /api/frames/{id}` — удалить рамку

🔒 Требует токен. Только своя рамка (не системная).

**Response `204`:** без тела.

---

## `POST /api/admin/frames` — создать системную рамку

🔒 Требует токен администратора.

Системные рамки видны всем пользователям без токена в `GET /api/frames`. `ownerId` в ответе будет `00000000-0000-0000-0000-000000000000`.

**Request:** `multipart/form-data`

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `name` | string | да | Название рамки |
| `frameImage` | binary | да | Картинка рамки (`frame_image`) |
| `backgroundImage` | binary | нет | Фон-компаньон (`background_image`) |
| `tagIds` | Short[] | нет | Массив id тегов |

**Response `201`:** объект `FrameResponse` (см. `GET /api/frames`).

---

## `POST /api/admin/tags` — создать тег

🔒 Требует токен администратора.

**Request:**
```json
{ "name": "fantasy" }
```

Ограничение: max 50 символов.

**Response `201`:**
```json
{ "id": 5, "name": "fantasy" }
```

Если тег с таким именем уже есть — `409`.

---

## `PUT /api/admin/tags/{id}` — переименовать тег

🔒 Требует токен администратора.

**Request:**
```json
{ "name": "новое имя" }
```

**Response `200`:** обновлённый `{ "id": 5, "name": "новое имя" }`.

`404` если тег не найден, `409` если новое имя уже занято другим тегом.

---

## `DELETE /api/admin/tags/{id}` — удалить тег

🔒 Требует токен администратора.

**Response `204`:** без тела.

`404` если тег не найден. Тег автоматически снимается со всех рамок, которые его использовали (каскадное удаление).

---

## Формат ошибок

Все ошибки — единый JSON:
```json
{
  "status": 404,
  "message": "Frame not found: uuid",
  "path": "/api/frames/uuid"
}
```

| Статус | Когда |
|--------|-------|
| 400 | Ошибка валидации (`message` содержит перечисление полей: `field: reason`) |
| 401 | Нет токена или токен невалиден/просрочен |
| 403 | Попытка удалить чужой/системный ресурс |
| 404 | Ресурс не найден |
| 409 | Конфликт (дублирующийся email/username, нарушение целостности) |
| 413 | Файл превышает лимит 60 MB |
| 429 | Слишком много попыток входа; смотреть `Retry-After` в заголовке ответа |

Ошибка 400 от валидации выглядит так:
```json
{
  "status": 400,
  "message": "email: must be a well-formed email address; password: size must be between 8 and 128",
  "path": "/api/auth/register"
}
```

---

## Поведение presigned URL

Presigned URL в `frameAssetUrl`, `backgroundAssetUrl`, `AssetResponse.url` — временные (генерируются на лету, не хранятся в БД). Фронт должен использовать их сразу для отображения, но не сохранять как постоянный адрес. При необходимости показа через длительное время — снова запросить список/объект с бэкенда.

---

## Ещё не реализовано (бэклог)

- `TokenProjectController` / `HandoutProjectController` — в разработке
- Квоты по тарифу (`max_loaded_file_size` из `plans` ещё не проверяется в upload)
