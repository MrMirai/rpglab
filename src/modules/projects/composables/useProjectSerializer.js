import { SCHEMA_VERSION } from '../schema/tokenProject.js'

// Растеризует HTMLImageElement/HTMLCanvasElement в ImageRef.
// uploadImage(blob) => Promise<{ key, url }> — опциональный колбэк для загрузки
// ассета на сервер; без него изображение сериализуется inline (data URL) —
// сценарий локального несохранённого проекта.
// key — непрозрачный assetId, который целиком возвращает uploadImage(). Сервер
// дедуплицирует файлы по SHA-256 содержимого, поэтому key НЕ конструируется
// здесь (например, из projectId/имени файла) — предсказуемый путь на клиенте
// сломал бы дедупликацию на сервере.
async function imageToRef(source, uploadImage) {
  if (!source) return null

  const width = source.width
  const height = source.height

  if (!uploadImage) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(source, 0, 0, width, height)
    return {
      source: 'inline',
      dataUrl: canvas.toDataURL('image/png'),
      mimeType: 'image/png',
      width,
      height,
    }
  }

  const blob = await new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(source, 0, 0, width, height)
    canvas.toBlob(resolve, 'image/png')
  })
  const { key, url } = await uploadImage(blob)
  return { source: 'remote', key, url, mimeType: 'image/png', width, height }
}

// Собирает JSON проекта токена из "сырого" снимка редактора
// (useEditorSnapshot().getSnapshot()) и метаданных проекта.
export async function serializeProject(snapshot, { uploadImage = null, meta = {} } = {}) {
  const now = new Date().toISOString()

  const [charImage, frameImage, maskImage, bgImage, brushImage] = await Promise.all([
    imageToRef(snapshot.charImage, uploadImage),
    imageToRef(snapshot.frameImage, uploadImage),
    imageToRef(snapshot.maskImage, uploadImage),
    imageToRef(snapshot.bgImage, uploadImage),
    imageToRef(snapshot.brushCanvas, uploadImage),
  ])

  return {
    schemaVersion: SCHEMA_VERSION,

    id: meta.id ?? crypto.randomUUID(),
    name: meta.name ?? 'Без названия',
    createdAt: meta.createdAt ?? now,
    updatedAt: now,

    canvas: {
      size: snapshot.canvasSize,
    },

    character: {
      image: charImage,
      x: snapshot.charX,
      y: snapshot.charY,
      scale: snapshot.charScale,

      filters: {
        hue: snapshot.charHue,
        saturation: snapshot.charSaturation,
        brightness: snapshot.charBrightness,
        contrast: snapshot.charContrast,
        luminosity: snapshot.charLuminosity,
      },

      shadow: {
        enabled: snapshot.charShadowEnabled,
        color: snapshot.charShadowColor,
        blur: snapshot.charShadowBlur,
        offsetX: snapshot.charShadowOffsetX,
        offsetY: snapshot.charShadowOffsetY,
        opacity: snapshot.charShadowOpacity,
      },
    },

    frame: {
      image: frameImage,
      fileName: snapshot.frameFileName,
    },

    mask: {
      useCustomMask: snapshot.useCustomMask,
      customImage: maskImage,
      overflow: {
        y: snapshot.overflowY,
        soft: snapshot.overflowSoft,
      },
      brush: brushImage,
    },

    background: {
      type: snapshot.bgType,
      color: snapshot.bgColor,
      image: bgImage,

      auto: {
        baseColor: snapshot.bgAutoColor,
        centerLight: snapshot.bgCenterLight,
        edgeLight: snapshot.bgEdgeLight,
        noiseStrength: snapshot.bgNoiseStrength,
        grain: snapshot.bgGrain,
        noiseType: snapshot.bgNoiseType,
        generatedImage: null,
      },
    },

    toolPrefs: {
      brushSize: snapshot.brushSize,
      brushHardness: snapshot.brushHardness,
      brushMode: snapshot.brushMode,
      lassoMode: snapshot.lassoMode,
    },
  }
}
