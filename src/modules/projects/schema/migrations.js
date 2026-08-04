import { SCHEMA_VERSION } from './tokenProject.js'

// Миграции содержимого проекта между версиями схемы. Бэкенд про версии не знает
// и ничего не переписывает - что положили, то и вернётся, поэтому поднимать
// старый проект до актуального формата обязан клиент.
//
// Ключ - версия, ИЗ которой мигрируем; функция обязана вернуть содержимое со
// schemaVersion на единицу больше. Одно место, где видна вся история формата.

// v1 хранил картинки объектом ImageRef:
//   { source: 'remote', key, url, mimeType, width, height } | { source: 'inline', dataUrl } | null
// В v2 остаётся только ссылка-assetId (key из remote-варианта). Inline-картинки
// перенести НЕЛЬЗЯ: assetId выдаёт сервер при заливке, придумать его на клиенте
// невозможно - такой слот остаётся пустым, редактор покажет пустую зону загрузки.
function refToAssetId(ref) {
  return ref && ref.source === 'remote' ? (ref.key ?? null) : null
}

const migrations = {
  // v1 → v2: ImageRef → поля-assetId (контракт бэкенда по имени поля,
  // см. tokenProject.js) + добавлен массив источников света lights.
  1: (config) => {
    const { image: charImage, ...character } = config.character ?? {}
    const { image: frameImage, ...frame } = config.frame ?? {}
    const { image: bgImage, auto, ...background } = config.background ?? {}
    const { brush, ...mask } = config.mask ?? {}
    // generatedImage в v1 всегда был null - авто-фон процедурный и пересобирается
    // из параметров, картинку хранить незачем.
    const { generatedImage, ...autoRest } = auto ?? {}

    return {
      ...config,
      schemaVersion: 2,
      character: { ...character, assetId: refToAssetId(charImage) },
      frame: { ...frame, frameAssetId: refToAssetId(frameImage) },
      background: { ...background, imageAssetId: refToAssetId(bgImage), auto: autoRest },
      mask: { ...mask, brushMaskAssetId: refToAssetId(brush) },
      lights: config.lights ?? [],
    }
  },
}

// Поднимает содержимое до SCHEMA_VERSION. Содержимое новее актуальной версии
// (пользователь открыл проект в старой вкладке) не трогаем - незнакомые поля
// сохранятся при сериализации через слияние с базой.
export function migrate(config) {
  let current = config ?? {}
  // Шага для версии нет - дальше не поднимаемся: дефолты наложит applyDefaults,
  // молчаливое зацикливание тут хуже неполной миграции.
  while (typeof current.schemaVersion === 'number' && current.schemaVersion < SCHEMA_VERSION) {
    const step = migrations[current.schemaVersion]
    if (!step) break
    const next = step(current)
    if (!(next.schemaVersion > current.schemaVersion)) break
    current = next
  }
  return current
}
