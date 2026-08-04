import { SCHEMA_VERSION } from '../schema/tokenProject.js'

// Тип ассета (POST /api/assets?type=…) для каждого слота редактора. Значения -
// строчный snake_case, как их ждёт бэкенд.
const ASSET_TYPE = {
  char: 'character_image',
  frame: 'frame_image',
  bg: 'background_image',
  brush: 'brush_mask',
}

function sourceToBlob(source) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

// Возвращает assetId для одного слота.
// Если у картинки уже есть assetId (пришла с сервера при открытии проекта или
// выбрана встроенная рамка) - файл НЕ перезаливается: содержимое то же, сервер
// вернул бы по дедупликации тот же id, а растеризация в PNG + upload на каждое
// сохранение стоят времени и трафика. Для встроенной рамки это ещё и вопрос
// владения: дедупликация идёт по паре (пользователь, хеш) и с системным файлом
// не схлопывается - перезаливка наплодила бы личную копию у каждого юзера.
// Без uploadAsset (нет сессии/офлайн) ссылка остаётся пустой: класть картинку
// в содержимое инлайном нельзя, лимит configuration - 1 МиБ.
async function resolveAssetId(source, knownAssetId, type, uploadAsset) {
  if (!source) return null
  if (knownAssetId) return knownAssetId
  if (!uploadAsset) return null

  const blob = await sourceToBlob(source)
  const asset = await uploadAsset(blob, type)
  return asset?.id ?? null
}

// Собирает configuration проекта токена из "сырого" снимка редактора
// (useEditorSnapshot().getSnapshot()).
//
// baseConfig - содержимое, пришедшее с сервера при открытии проекта. Собирать
// configuration с нуля НЕЛЬЗЯ: бэкенд хранит содержимое как есть и вернул бы
// поля, которых эта версия редактора не знает (сохранены новее/старее), но если
// перезаписать содержимое собранным с нуля объектом - они потеряются на клиенте.
// Поэтому известные поля НАКЛАДЫВАЮТСЯ на пришедшую базу.
export async function serializeProject(snapshot, { uploadAsset = null, baseConfig = null } = {}) {
  // Клонируем через JSON, а НЕ structuredClone: база приходит из стора и может
  // оказаться реактивным Proxy, а structuredClone на прокси бросает DataCloneError
  // («could not be cloned»). Заодно JSON-проход гарантирует, что в базе только
  // то, что переживёт отправку на сервер - содержимое всё равно уедет как JSON.
  const base = baseConfig ? JSON.parse(JSON.stringify(baseConfig)) : {}

  const [charAssetId, frameAssetId, imageAssetId, brushMaskAssetId] = await Promise.all([
    resolveAssetId(snapshot.charImage, snapshot.charAssetId, ASSET_TYPE.char, uploadAsset),
    resolveAssetId(snapshot.frameImage, snapshot.frameAssetId, ASSET_TYPE.frame, uploadAsset),
    resolveAssetId(snapshot.bgImage, snapshot.bgAssetId, ASSET_TYPE.bg, uploadAsset),
    resolveAssetId(snapshot.brushCanvas, snapshot.brushAssetId, ASSET_TYPE.brush, uploadAsset),
  ])

  return {
    ...base,
    schemaVersion: SCHEMA_VERSION,

    canvas: {
      ...base.canvas,
      size: snapshot.canvasSize,
    },

    character: {
      ...base.character,
      assetId: charAssetId,
      x: snapshot.charX,
      y: snapshot.charY,
      scale: snapshot.charScale,

      filters: {
        ...base.character?.filters,
        hue: snapshot.charHue,
        saturation: snapshot.charSaturation,
        brightness: snapshot.charBrightness,
        contrast: snapshot.charContrast,
        luminosity: snapshot.charLuminosity,
      },

      shadow: {
        ...base.character?.shadow,
        enabled: snapshot.charShadowEnabled,
        color: snapshot.charShadowColor,
        blur: snapshot.charShadowBlur,
        offsetX: snapshot.charShadowOffsetX,
        offsetY: snapshot.charShadowOffsetY,
        opacity: snapshot.charShadowOpacity,
      },
    },

    frame: {
      ...base.frame,
      frameAssetId,
      fileName: snapshot.frameFileName,
    },

    mask: {
      ...base.mask,
      overflow: {
        ...base.mask?.overflow,
        y: snapshot.overflowY,
        soft: snapshot.overflowSoft,
      },
      brushMaskAssetId,
    },

    background: {
      ...base.background,
      type: snapshot.bgType,
      color: snapshot.bgColor,
      imageAssetId,

      auto: {
        ...base.background?.auto,
        baseColor: snapshot.bgAutoColor,
        centerLight: snapshot.bgCenterLight,
        edgeLight: snapshot.bgEdgeLight,
        noiseStrength: snapshot.bgNoiseStrength,
        grain: snapshot.bgGrain,
        noiseType: snapshot.bgNoiseType,
      },
    },

    // Список целиком заменяет базу: слить массивы по индексу нельзя - удалённый
    // источник света «воскрес» бы из baseConfig.
    lights: (snapshot.lights ?? []).map((light) => ({ ...light })),

    toolPrefs: {
      ...base.toolPrefs,
      brushSize: snapshot.brushSize,
      brushHardness: snapshot.brushHardness,
      brushMode: snapshot.brushMode,
      lassoMode: snapshot.lassoMode,
    },
  }
}
