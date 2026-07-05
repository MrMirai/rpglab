import { useEditorStore } from '../store.js'
import { useBrushMask } from './useBrushMask.js'

// Снимок состояния редактора для сохранения/восстановления проекта.
// Возвращает/принимает "сырые" значения стора (HTMLImageElement/HTMLCanvasElement/
// примитивы) — без UI/computed-полей. Ничего не знает про JSON/ImageRef/MinIO,
// этим занимается модуль projects (см. useProjectSerializer/useProjectDeserializer).
export function useEditorSnapshot() {
  const store = useEditorStore()
  const { brushCanvas, loadFromImage: loadBrushFromImage, bumpBrushVersion } = useBrushMask()

  function getSnapshot() {
    return {
      canvasSize: store.canvasSize,

      charImage: store.charImage,
      charX: store.charX,
      charY: store.charY,
      charScale: store.charScale,

      charHue: store.charHue,
      charSaturation: store.charSaturation,
      charBrightness: store.charBrightness,
      charContrast: store.charContrast,
      charLuminosity: store.charLuminosity,

      charShadowEnabled: store.charShadowEnabled,
      charShadowColor: store.charShadowColor,
      charShadowBlur: store.charShadowBlur,
      charShadowOffsetX: store.charShadowOffsetX,
      charShadowOffsetY: store.charShadowOffsetY,
      charShadowOpacity: store.charShadowOpacity,

      frameImage: store.frameImage,
      frameFileName: store.frameFileName,

      useCustomMask: store.useCustomMask,
      maskImage: store.useCustomMask ? store.maskImage : null,
      overflowY: store.overflowY,
      overflowSoft: store.overflowSoft,
      brushCanvas,

      bgType: store.bgType,
      bgColor: store.bgColor,
      bgImage: store.bgType === 'image' ? store.bgImage : null,
      bgAutoColor: store.bgAutoColor,
      bgCenterLight: store.bgCenterLight,
      bgEdgeLight: store.bgEdgeLight,
      bgNoiseStrength: store.bgNoiseStrength,
      bgGrain: store.bgGrain,
      bgNoiseType: store.bgNoiseType,

      brushSize: store.brushSize,
      brushHardness: store.brushHardness,
      brushMode: store.brushMode,
      lassoMode: store.lassoMode,
    }
  }

  function applySnapshot(snapshot) {
    if (snapshot.canvasSize != null) store.canvasSize = snapshot.canvasSize

    store.loadCharImage(snapshot.charImage ?? null)
    store.setCharPosition(snapshot.charX ?? 0, snapshot.charY ?? 0)
    store.setCharScale(snapshot.charScale ?? 1)

    store.charHue = snapshot.charHue ?? 0
    store.charSaturation = snapshot.charSaturation ?? 100
    store.charBrightness = snapshot.charBrightness ?? 100
    store.charContrast = snapshot.charContrast ?? 100
    store.charLuminosity = snapshot.charLuminosity ?? 0

    store.charShadowEnabled = snapshot.charShadowEnabled ?? false
    store.charShadowColor = snapshot.charShadowColor ?? '#000000'
    store.charShadowBlur = snapshot.charShadowBlur ?? 20
    store.charShadowOffsetX = snapshot.charShadowOffsetX ?? 0
    store.charShadowOffsetY = snapshot.charShadowOffsetY ?? 8
    store.charShadowOpacity = snapshot.charShadowOpacity ?? 60

    store.loadFrameImage(snapshot.frameImage ?? null)
    store.frameFileName = snapshot.frameFileName ?? ''

    store.useCustomMask = snapshot.useCustomMask ?? false
    store.loadMaskImage(snapshot.useCustomMask ? (snapshot.maskImage ?? null) : null)
    store.maskVersion++
    store.overflowY = snapshot.overflowY ?? 35
    store.overflowSoft = snapshot.overflowSoft ?? 20

    if (snapshot.brushCanvas) {
      loadBrushFromImage(snapshot.brushCanvas)
    } else {
      brushCanvas.getContext('2d').clearRect(0, 0, brushCanvas.width, brushCanvas.height)
      bumpBrushVersion()
    }

    store.setBgColor(snapshot.bgColor ?? '#1a1a2e')
    if (snapshot.bgType === 'image' && snapshot.bgImage) {
      store.loadBgImage(snapshot.bgImage)
    } else {
      store.bgImage = null
      store.setBgType(snapshot.bgType ?? 'none')
    }
    store.setBgAutoColor(snapshot.bgAutoColor ?? '#28283c')
    store.bgCenterLight = snapshot.bgCenterLight ?? 0.7
    store.bgEdgeLight = snapshot.bgEdgeLight ?? 1.3
    store.bgNoiseStrength = snapshot.bgNoiseStrength ?? 15
    store.bgGrain = snapshot.bgGrain ?? 6
    store.setBgNoiseType(snapshot.bgNoiseType ?? 'perlin')

    store.brushSize = snapshot.brushSize ?? 30
    store.brushHardness = snapshot.brushHardness ?? 50
    store.setBrushMode(snapshot.brushMode ?? 'restore')
    store.setLassoMode(snapshot.lassoMode ?? 'add')
  }

  return { getSnapshot, applySnapshot }
}
