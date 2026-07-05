import { useImageLoader } from '@/modules/editor'

// Загружает ImageRef обратно в HTMLImageElement.
// inline — из data URL напрямую; remote — по url (MinIO), с crossOrigin для
// последующего чтения пикселей (getImageData) в маске/экспорте/кисти.
async function refToImage(ref) {
  if (!ref) return null
  const { loadFromUrl } = useImageLoader()
  return loadFromUrl(ref.source === 'inline' ? ref.dataUrl : ref.url)
}

// Восстанавливает "сырой" снимок редактора (для useEditorSnapshot().applySnapshot())
// из JSON проекта токена.
export async function deserializeProject(project) {
  const [charImage, frameImage, maskImage, bgImage, brushImage] = await Promise.all([
    refToImage(project.character.image),
    refToImage(project.frame.image),
    refToImage(project.mask.customImage),
    refToImage(project.background.image),
    refToImage(project.mask.brush),
  ])

  return {
    canvasSize: project.canvas.size,

    charImage,
    charX: project.character.x,
    charY: project.character.y,
    charScale: project.character.scale,

    charHue: project.character.filters.hue,
    charSaturation: project.character.filters.saturation,
    charBrightness: project.character.filters.brightness,
    charContrast: project.character.filters.contrast,
    charLuminosity: project.character.filters.luminosity,

    charShadowEnabled: project.character.shadow.enabled,
    charShadowColor: project.character.shadow.color,
    charShadowBlur: project.character.shadow.blur,
    charShadowOffsetX: project.character.shadow.offsetX,
    charShadowOffsetY: project.character.shadow.offsetY,
    charShadowOpacity: project.character.shadow.opacity,

    frameImage,
    frameFileName: project.frame.fileName,

    useCustomMask: project.mask.useCustomMask,
    maskImage,
    overflowY: project.mask.overflow.y,
    overflowSoft: project.mask.overflow.soft,
    brushCanvas: brushImage,

    bgType: project.background.type,
    bgColor: project.background.color,
    bgImage,
    bgAutoColor: project.background.auto.baseColor,
    bgCenterLight: project.background.auto.centerLight,
    bgEdgeLight: project.background.auto.edgeLight,
    bgNoiseStrength: project.background.auto.noiseStrength,
    bgGrain: project.background.auto.grain,
    bgNoiseType: project.background.auto.noiseType,

    brushSize: project.toolPrefs.brushSize,
    brushHardness: project.toolPrefs.brushHardness,
    brushMode: project.toolPrefs.brushMode,
    lassoMode: project.toolPrefs.lassoMode,
  }
}
