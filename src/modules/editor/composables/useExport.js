import { useAutoMask } from './useAutoMask'
import { useAutoBackground } from './useAutoBackground'

export function useExport() {
  const { generateMask } = useAutoMask()
  const { generateBackground } = useAutoBackground()

  async function getMask(frameImg, size) {
    return generateMask(frameImg, size)
  }

  function scaleBrushCanvas(src, size) {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    c.getContext('2d').drawImage(src, 0, 0, size, size)
    return c
  }

  function renderAutoBg(store, size) {
    const hex = store.bgAutoColor.replace('#', '')
    const baseColor = {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    }
    return generateBackground(
      baseColor,
      {
        centerLightness: store.bgCenterLight,
        edgeLightness: store.bgEdgeLight,
        noiseStrength: store.bgNoiseStrength / 100,
        grain: store.bgGrain,
        noiseType: store.bgNoiseType,
      },
      size,
    )
  }

  // Возвращает функцию отрисовки фона нужного типа (или null если фона нет)
  function getBgDrawFn(store, size) {
    if (store.bgType === 'color') {
      return (tc) => {
        tc.fillStyle = store.bgColor
        tc.fillRect(0, 0, size, size)
      }
    } else if (store.bgType === 'image' && store.bgImage) {
      return (tc) => {
        const img = store.bgImage
        const scale = Math.max(size / img.width, size / img.height)
        const sw = img.width * scale
        const sh = img.height * scale
        tc.drawImage(img, (size - sw) / 2, (size - sh) / 2, sw, sh)
      }
    } else if (store.bgType === 'auto') {
      const bg = renderAutoBg(store, size)
      return (tc) => tc.drawImage(bg, 0, 0)
    }
    return null
  }

  function drawMasked(ctx, size, drawFn, maskCanvas) {
    const tmp = document.createElement('canvas')
    tmp.width = size
    tmp.height = size
    const tc = tmp.getContext('2d')
    drawFn(tc)
    tc.globalCompositeOperation = 'destination-in'
    tc.drawImage(maskCanvas, 0, 0, size, size)
    tc.globalCompositeOperation = 'source-over'
    ctx.drawImage(tmp, 0, 0)
  }

  async function exportToken(store, brushCanvas, options = {}) {
    const { size = 512, mode = 'full', printBgColor = null } = options

    const ratio = size / store.canvasSize

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Цветной фон для печати — только в режиме полного токена
    if (printBgColor && mode === 'full') {
      ctx.fillStyle = printBgColor
      ctx.fillRect(0, 0, size, size)
    }

    const mask1 = await getMask(store.frameImage, size)

    const charImg = store.charImage
    const charW = charImg.width * store.charScale * ratio
    const charH = charImg.height * store.charScale * ratio
    const charX = size / 2 + store.charX * ratio - charW / 2
    const charY = size / 2 + store.charY * ratio - charH / 2

    const drawChar = (tc) => tc.drawImage(charImg, charX, charY, charW, charH)

    if (mode === 'full') {
      // 1. Фон × маска1
      if (store.bgType !== 'none') {
        const bgFn = getBgDrawFn(store, size)
        if (bgFn) drawMasked(ctx, size, bgFn, mask1)
      }
      // 2. Персонаж нижний × маска1
      drawMasked(ctx, size, drawChar, mask1)
      // 3. Рамка
      ctx.drawImage(store.frameImage, 0, 0, size, size)
      // 4. Персонаж верхний × brushCanvas (эффект вылезания)
      const scaledBrush = scaleBrushCanvas(brushCanvas, size)
      drawMasked(ctx, size, drawChar, scaledBrush)
    } else if (mode === 'char-only') {
      // Только персонаж: нижний × маска1 + вылезание × brushCanvas, без рамки и фона
      drawMasked(ctx, size, drawChar, mask1)
      const scaledBrush = scaleBrushCanvas(brushCanvas, size)
      drawMasked(ctx, size, drawChar, scaledBrush)
    }

    return canvas
  }

  function downloadPng(canvas, filename = 'token.png') {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return { exportToken, downloadPng }
}
