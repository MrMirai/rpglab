import { applyHandoutDefaults, migrateHandout } from '../schema/handoutProject.js'

// Разворачивает ссылку-assetId в пригодный для холста url через словарь assets
// из ProjectResponse: { "<assetId>": { url, owner } }.
//
// Берём НЕ presigned-ссылку напрямую, а её содержимое в локальный object URL:
// presigned живёт 15 минут и протухнет прямо в открытой вкладке, а холст
// подтягивает картинку по url лениво (imageFor кеширует по строке url) - через
// полчаса работы элемент мог бы просто перестать рисоваться.
//
// Ключа в словаре может не быть - файл удалён/потерян. Это НЕ ошибка открытия:
// элемент останется без картинки, а имя слота уедет в missingAssets. Падать
// нельзя - иначе один потерянный файл делает всю раздатку неоткрываемой.
async function resolveAssetUrl(assetId, assets, slot, missing) {
  if (!assetId) return null

  const url = assets?.[assetId]?.url
  if (!url) {
    missing.push(slot)
    return null
  }

  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`Не удалось загрузить ассет (${res.status})`)
    return URL.createObjectURL(await res.blob())
  } catch {
    missing.push(slot)
    return null
  }
}

// Восстанавливает состояние редактора раздаток (для store.replaceDocument)
// из ответа GET /api/projects/{id}.
//
// Возвращает { state, config, missingAssets }:
//   config - мигрированное содержимое ЦЕЛИКОМ (включая незнакомые поля). Его
//     обязан сохранить вызывающий и передать в сериализатор как baseConfig,
//     иначе следующее сохранение сотрёт то, чего эта версия редактора не знает.
export async function deserializeHandoutProject(project) {
  // Сначала миграции и дефолты, только потом чтение вложенных полей: проект мог
  // быть сохранён версией, где секции ещё не было.
  const config = applyHandoutDefaults(migrateHandout(project?.configuration ?? {}))
  const assets = project?.assets ?? {}
  const missingAssets = []

  const background = config.document.background

  const [textureUrl, elements] = await Promise.all([
    resolveAssetUrl(background.textureAssetId, assets, 'фон', missingAssets),
    Promise.all(
      config.elements.map(async (element) => {
        if (element.type !== 'IMAGE' || !element.assetId) return { ...element }
        const url = await resolveAssetUrl(element.assetId, assets, 'изображение', missingAssets)
        // Файл не нашёлся - гасим и ссылку: сохранение с assetId, которого на
        // сервере нет, бэкенд отвергнет (404 по ассету), и проект стало бы
        // невозможно сохранить вовсе.
        return { ...element, url, assetId: url ? element.assetId : null }
      }),
    ),
  ])

  const state = {
    document: {
      ...config.document,
      background: {
        ...background,
        textureUrl,
        textureAssetId: textureUrl ? background.textureAssetId : null,
      },
    },
    elements,
  }

  return { state, config, missingAssets }
}
