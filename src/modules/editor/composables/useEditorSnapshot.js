import { useEditorStore } from '../store.js'
import { useBrushMask } from './useBrushMask.js'

// Снимок состояния редактора для сохранения/восстановления проекта.
// Возвращает/принимает "сырые" значения стора (HTMLImageElement/HTMLCanvasElement/
// примитивы) - без UI/computed-полей. Ничего не знает про JSON/ImageRef/MinIO,
// этим занимается модуль projects (см. useProjectSerializer/useProjectDeserializer).
export function useEditorSnapshot() {
  const store = useEditorStore()
  const {
    brushCanvas,
    brushVersion,
    loadFromImage: loadBrushFromImage,
    bumpBrushVersion,
  } = useBrushMask()

  function getSnapshot() {
    return {
      canvasSize: store.canvasSize,

      charImage: store.charImage,
      // assetId уже залитой картинки - чтобы сохранение не заливало её повторно.
      // Превью-URL идут вместе с картинкой: без них при открытии другого проекта
      // в панели свойств осталась бы миниатюра предыдущего.
      charAssetId: store.charAssetId,
      charPreviewUrl: store.charPreviewUrl,
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
      frameAssetId: store.frameAssetId,
      framePreviewUrl: store.framePreviewUrl,
      frameFileName: store.frameFileName,

      overflowY: store.overflowY,
      overflowSoft: store.overflowSoft,
      brushCanvas,
      brushVersion: brushVersion.value,
      // Маску кисти правят прямо на холсте, поэтому её assetId действителен
      // только для той версии brushCanvas, на которой был получен: после мазка
      // ссылка ведёт на устаревший файл и слот считается незалитым.
      brushAssetId: store.brushAssetVersion === brushVersion.value ? store.brushAssetId : null,

      bgType: store.bgType,
      bgColor: store.bgColor,
      bgImage: store.bgType === 'image' ? store.bgImage : null,
      bgAssetId: store.bgType === 'image' ? store.bgAssetId : null,
      bgPreviewUrl: store.bgPreviewUrl,
      bgAutoColor: store.bgAutoColor,
      bgCenterLight: store.bgCenterLight,
      bgEdgeLight: store.bgEdgeLight,
      bgNoiseStrength: store.bgNoiseStrength,
      bgGrain: store.bgGrain,
      bgNoiseType: store.bgNoiseType,

      // Источники света - простые объекты, копируем глубоко, чтобы снапшот
      // не менялся вслед за стором
      lights: store.lights.map((l) => ({ ...l })),

      brushSize: store.brushSize,
      brushHardness: store.brushHardness,
      brushMode: store.brushMode,
      lassoMode: store.lassoMode,
    }
  }

  function applySnapshot(snapshot) {
    if (snapshot.canvasSize != null) store.canvasSize = snapshot.canvasSize

    // removeChar/removeFrame/removeBgImage перед загрузкой - чтобы освободить
    // object URL прошлого превью: loadXImage(img) без url его не трогает, и в
    // панели свойств осталась бы миниатюра предыдущего проекта.
    store.removeChar()
    if (snapshot.charImage) {
      store.loadCharImage(snapshot.charImage, snapshot.charPreviewUrl ?? null, snapshot.charAssetId ?? null)
    }
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

    store.removeFrame()
    if (snapshot.frameImage) {
      store.loadFrameImage(snapshot.frameImage, snapshot.framePreviewUrl ?? null, snapshot.frameAssetId ?? null)
    }
    store.frameFileName = snapshot.frameFileName ?? ''

    store.maskVersion++
    store.overflowY = snapshot.overflowY ?? 35
    store.overflowSoft = snapshot.overflowSoft ?? 20

    if (snapshot.brushCanvas) {
      loadBrushFromImage(snapshot.brushCanvas)
    } else {
      brushCanvas.getContext('2d').clearRect(0, 0, brushCanvas.width, brushCanvas.height)
      bumpBrushVersion()
    }
    // Загруженная маска соответствует своему серверному файлу - фиксируем это
    // на текущей (только что увеличенной) версии холста, иначе первое сохранение
    // зальёт её копию заново.
    store.brushAssetId = snapshot.brushAssetId ?? null
    store.brushAssetVersion = snapshot.brushAssetId ? brushVersion.value : -1

    store.setBgColor(snapshot.bgColor ?? '#1a1a2e')
    store.removeBgImage()
    if (snapshot.bgType === 'image' && snapshot.bgImage) {
      store.loadBgImage(snapshot.bgImage, snapshot.bgPreviewUrl ?? null, snapshot.bgAssetId ?? null)
    } else {
      store.setBgType(snapshot.bgType ?? 'none')
    }
    store.setBgAutoColor(snapshot.bgAutoColor ?? '#28283c')
    store.bgCenterLight = snapshot.bgCenterLight ?? 0.7
    store.bgEdgeLight = snapshot.bgEdgeLight ?? 1.3
    store.bgNoiseStrength = snapshot.bgNoiseStrength ?? 15
    store.bgGrain = snapshot.bgGrain ?? 6
    store.setBgNoiseType(snapshot.bgNoiseType ?? 'perlin')

    // setLights, а не присваивание списка: он перематывает счётчик id за
    // загруженные источники (иначе следующий addLight выдаст занятый id).
    store.setLights(snapshot.lights)

    store.brushSize = snapshot.brushSize ?? 30
    store.brushHardness = snapshot.brushHardness ?? 50
    store.setBrushMode(snapshot.brushMode ?? 'restore')
    store.setLassoMode(snapshot.lassoMode ?? 'add')
  }

  // Записывает обратно в стор assetId'ы, выданные сервером при сохранении
  // проекта: следующее сохранение уже не будет перезаливать те же картинки.
  // brushVersion берётся из снимка, с которого шло сохранение - пользователь мог
  // успеть мазнуть кистью, пока файлы уезжали на сервер, и тогда ссылка на маску
  // сразу протухшая.
  function commitAssetIds({ char, frame, bg, brushMask, brushVersion: savedBrushVersion } = {}) {
    store.charAssetId = char ?? null
    store.frameAssetId = frame ?? null
    store.bgAssetId = bg ?? null
    store.brushAssetId = brushMask ?? null
    store.brushAssetVersion = brushMask ? (savedBrushVersion ?? brushVersion.value) : -1
  }

  return { getSnapshot, applySnapshot, commitAssetIds }
}
