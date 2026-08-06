import { deepMerge } from './deepMerge.js'

export const SCHEMA_VERSION = 2

// Содержимое проекта (configuration в ProjectResponse) непрозрачно для бэкенда:
// он не знает структуру, ничего не валидирует и ничего не дописывает. Проверяет
// ровно три вещи - что это JSON-объект, что внутри есть числовой schemaVersion >= 1
// и что размер <= 1 МиБ. Отсюда следствия: миграции и дефолты - целиком на клиенте
// (migrations.js + applyDefaults ниже), а картинки в содержимое НЕ встраиваются
// (data URL сожрал бы лимит) - только ссылки на заранее залитые ассеты.
//
// ССЫЛКА НА ФАЙЛ - ЭТО КОНТРАКТ ПО ИМЕНИ ПОЛЯ. Бэкенд обходит configuration
// целиком (любая глубина, включая массивы) и считает ссылкой на файл значение
// поля, чьё имя равно `assetId` либо заканчивается на `AssetId`; значение -
// строка-UUID или null. Именно по этим полям он закрепляет файлы за проектом
// и защищает их от сборки мусора. Поле с другим именем (image / imageId / src)
// бэкенд НЕ УВИДИТ: файл останется неприкреплённым и будет удалён как ненужный.
// Поэтому переименование любого *AssetId-поля - ломающее изменение схемы.
export function createEmptyProject() {
  return {
    schemaVersion: SCHEMA_VERSION,

    canvas: {
      size: 500,
    },

    character: {
      assetId: null,
      x: 0,
      y: 0,
      scale: 1,

      filters: {
        hue: 0,
        saturation: 100,
        brightness: 100,
        contrast: 100,
        luminosity: 0,
      },

      shadow: {
        enabled: false,
        color: '#000000',
        blur: 20,
        offsetX: 0,
        offsetY: 8,
        opacity: 60,
      },
    },

    frame: {
      frameAssetId: null,
      fileName: '',
    },

    mask: {
      overflow: {
        y: 35,
        soft: 20,
      },
      brushMaskAssetId: null,
    },

    background: {
      type: 'none',
      color: '#1a1a2e',
      imageAssetId: null,

      // Авто-фон процедурный: сохраняем параметры, а не картинку - она
      // пересобирается из них при открытии (useAutoBackground).
      auto: {
        baseColor: '#28283c',
        centerLight: 0.7,
        edgeLight: 1.3,
        noiseStrength: 15,
        grain: 6,
        noiseType: 'perlin',
      },
    },

    // Источники света: массив простых объектов, файлов не содержит.
    lights: [],

    toolPrefs: {
      brushSize: 30,
      brushHardness: 50,
      brushMode: 'restore',
      lassoMode: 'add',
    },
  }
}

// Накладывает дефолты на содержимое проекта. Вызывать ПОСЛЕ migrate():
// проект мог быть сохранён версией редактора, в которой поля ещё не было,
// и читать его вложенные поля напрямую (config.character.filters.hue) нельзя.
export function applyDefaults(config) {
  return deepMerge(createEmptyProject(), config)
}
