import { useImageLoader } from '@/modules/editor'
import { migrate } from '../schema/migrations.js'
import { applyDefaults } from '../schema/tokenProject.js'

// Разворачивает ссылку-assetId в картинку через словарь assets из ProjectResponse:
// { "<assetId>": { url, owner } }. Ключа может не быть - файл удалён/потерян;
// это НЕ ошибка загрузки проекта, слот просто остаётся пустым (редактор покажет
// зону загрузки), а имя слота уезжает в missingAssets, чтобы страница сказала
// об этом пользователю. Падать тут нельзя: иначе один потерянный файл делает
// весь проект неоткрываемым.
async function resolveAsset(assetId, assets, slot, missing, { asBlob = true } = {}) {
  if (!assetId) return { img: null, objectUrl: null }

  const url = assets?.[assetId]?.url
  if (!url) {
    missing.push(slot)
    return { img: null, objectUrl: null }
  }

  const { loadFromUrl, loadFromUrlAsBlob } = useImageLoader()
  try {
    // asBlob - для картинок, которые лягут в превью панели свойств: presigned-ссылка
    // живёт 15 минут и протухнет прямо в открытой вкладке, локальный object URL - нет.
    // Маску кисти превью не показывает, она сразу впекается в brushCanvas.
    if (!asBlob) return { img: await loadFromUrl(url), objectUrl: null }
    return await loadFromUrlAsBlob(url)
  } catch {
    missing.push(slot)
    return { img: null, objectUrl: null }
  }
}

// Восстанавливает "сырой" снимок редактора (для useEditorSnapshot().applySnapshot())
// из ответа GET /api/projects/{id}.
//
// Возвращает { snapshot, config, missingAssets }:
//   config - мигрированное содержимое ЦЕЛИКОМ (включая незнакомые поля). Его
//     обязан сохранить вызывающий и передать в serializeProject как baseConfig,
//     иначе следующее сохранение сотрёт то, чего эта версия редактора не знает.
//   missingAssets - имена слотов, чьи файлы не нашлись.
export async function deserializeProject(project) {
  // Сначала миграции и дефолты, только потом чтение вложенных полей: проект мог
  // быть сохранён версией, где секции ещё не было, и project.character.filters.hue
  // упало бы на undefined.
  const config = applyDefaults(migrate(project?.configuration ?? {}))
  const assets = project?.assets ?? {}
  const missingAssets = []

  const [char, frame, bg, brush] = await Promise.all([
    resolveAsset(config.character.assetId, assets, 'character', missingAssets),
    resolveAsset(config.frame.frameAssetId, assets, 'frame', missingAssets),
    resolveAsset(config.background.imageAssetId, assets, 'background', missingAssets),
    resolveAsset(config.mask.brushMaskAssetId, assets, 'mask', missingAssets, { asBlob: false }),
  ])

  const snapshot = {
    canvasSize: config.canvas.size,

    charImage: char.img,
    charAssetId: char.img ? config.character.assetId : null,
    charPreviewUrl: char.objectUrl,
    charX: config.character.x,
    charY: config.character.y,
    charScale: config.character.scale,

    charHue: config.character.filters.hue,
    charSaturation: config.character.filters.saturation,
    charBrightness: config.character.filters.brightness,
    charContrast: config.character.filters.contrast,
    charLuminosity: config.character.filters.luminosity,

    charShadowEnabled: config.character.shadow.enabled,
    charShadowColor: config.character.shadow.color,
    charShadowBlur: config.character.shadow.blur,
    charShadowOffsetX: config.character.shadow.offsetX,
    charShadowOffsetY: config.character.shadow.offsetY,
    charShadowOpacity: config.character.shadow.opacity,

    frameImage: frame.img,
    frameAssetId: frame.img ? config.frame.frameAssetId : null,
    framePreviewUrl: frame.objectUrl,
    frameFileName: config.frame.fileName,

    overflowY: config.mask.overflow.y,
    overflowSoft: config.mask.overflow.soft,
    brushCanvas: brush.img,
    brushAssetId: brush.img ? config.mask.brushMaskAssetId : null,

    bgType: config.background.type,
    bgColor: config.background.color,
    bgImage: bg.img,
    bgAssetId: bg.img ? config.background.imageAssetId : null,
    bgPreviewUrl: bg.objectUrl,
    bgAutoColor: config.background.auto.baseColor,
    bgCenterLight: config.background.auto.centerLight,
    bgEdgeLight: config.background.auto.edgeLight,
    bgNoiseStrength: config.background.auto.noiseStrength,
    bgGrain: config.background.auto.grain,
    bgNoiseType: config.background.auto.noiseType,

    lights: (config.lights ?? []).map((light) => ({ ...light })),

    brushSize: config.toolPrefs.brushSize,
    brushHardness: config.toolPrefs.brushHardness,
    brushMode: config.toolPrefs.brushMode,
    lassoMode: config.toolPrefs.lassoMode,
  }

  return { snapshot, config, missingAssets }
}
