import { getElementDefaults } from '@/modules/handout'
import { deepMerge } from './deepMerge.js'
import { runMigrations } from './runMigrations.js'

export const HANDOUT_SCHEMA_VERSION = 1

// Типы элементов, для которых редактор знает дефолты. Незнакомый тип (положен
// более новой версией редактора) НЕ ошибка: элемент проходит как есть, холст
// его просто не нарисует - это лучше, чем не открыть проект целиком.
const KNOWN_ELEMENT_TYPES = new Set(['TEXT', 'IMAGE', 'SHAPE'])

// Содержимое проекта раздатки. Правила те же, что у токена (см. tokenProject.js):
// бэкенд содержимое не разбирает, проверяет только что это объект с числовым
// schemaVersion и не больше 1 МиБ, а ссылки на файлы ищет по ИМЕНИ ПОЛЯ -
// `assetId` либо оканчивающееся на `AssetId`, на любой глубине И ВНУТРИ МАССИВОВ
// (элемент elements[3].assetId бэкенд найдёт).
//
// ВАЖНО: рантайм-поля url (blob:-ссылки на локальные файлы) в содержимое НЕ
// попадают - после перезагрузки вкладки они мертвы. Хранится только assetId,
// а url восстанавливается при открытии из словаря assets.
export function createEmptyHandoutProject() {
  return {
    schemaVersion: HANDOUT_SCHEMA_VERSION,

    document: {
      width: 794,
      height: 1123,
      sizePreset: 'a4-portrait',
      background: {
        type: 'color', // color | texture | none
        color: '#f5ecd8',
        textureAssetId: null,
      },
    },

    // Порядок в массиве = z-порядок (последний рисуется поверх).
    elements: [],
  }
}

// Дефолты элемента по его типу: список полей растёт от версии к версии
// (blendMode, inkStrength, flipX/flipY появились позже), и без этого шага
// старый проект открывался бы с undefined в новых полях.
function applyElementDefaults(element) {
  if (!element || !KNOWN_ELEMENT_TYPES.has(element.type)) return element
  return { ...getElementDefaults(element.type), ...element }
}

// Накладывает дефолты. Вызывать ПОСЛЕ migrate(): проект мог быть сохранён
// версией, в которой поля ещё не было.
export function applyHandoutDefaults(config) {
  const merged = deepMerge(createEmptyHandoutProject(), config)
  // Массив дефолты глубоким слиянием не получает (источник заменяет его
  // целиком), поэтому по элементам проходим отдельно.
  merged.elements = (Array.isArray(merged.elements) ? merged.elements : []).map(
    applyElementDefaults,
  )
  return merged
}

// История формата раздатки. Пока версия одна - таблица пуста, но живёт рядом
// со схемой, чтобы первый же несовместимый шаг было куда положить.
const handoutMigrations = {}

export function migrateHandout(config) {
  return runMigrations(config, handoutMigrations, HANDOUT_SCHEMA_VERSION)
}
