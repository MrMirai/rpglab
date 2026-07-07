import { useAutoMask } from './useAutoMask'
import { useAutoBackground } from './useAutoBackground'

// Кэш bounding box видимой (не замаскированной кистью) части персонажа за
// пределами рамки. Ключ — комбинация входов, которые на него влияют: скан
// alpha-пикселей дорогой, а calcOverflow дёргается на каждое открытие модалки
// экспорта / смену размера, хотя персонаж и кисть между этим не меняются.
let overflowBoundsCache = null
let overflowBoundsCacheKey = ''

// Видимая часть персонажа за пределами рамки — это alpha персонажа, пересечённая
// с brushCanvas (кисть "восстановить"/"стереть"). Части фигуры, выступающие за
// рамку, но скрытые кистью (не проявленные), в экспорт не входят и не должны
// раздувать его размер — поэтому bounding box считаем не по всему PNG персонажа,
// а по факту того, что реально останется видно на верхнем слое.
function getVisibleOverflowBounds(store, brushCanvas) {
  const charImg = store.charImage
  const frameSize = store.canvasSize
  const charW = charImg.width * store.charScale
  const charH = charImg.height * store.charScale
  const imgLeft = frameSize / 2 + store.charX - charW / 2
  const imgTop  = frameSize / 2 + store.charY - charH / 2

  // Область сканирования — bbox персонажа, расширенный до границ рамки (на случай,
  // если персонаж целиком внутри рамки — тогда overflow = 0 без сканирования).
  const scanLeft   = Math.min(imgLeft, 0)
  const scanTop    = Math.min(imgTop, 0)
  const scanRight  = Math.max(imgLeft + charW, frameSize)
  const scanBottom = Math.max(imgTop + charH, frameSize)
  const scanW = Math.ceil(scanRight - scanLeft)
  const scanH = Math.ceil(scanBottom - scanTop)

  const tmp = document.createElement('canvas')
  tmp.width = scanW; tmp.height = scanH
  const tc = tmp.getContext('2d')
  tc.drawImage(charImg, imgLeft - scanLeft, imgTop - scanTop, charW, charH)
  tc.globalCompositeOperation = 'destination-in'
  // brushCanvas рисуем 1:1 без масштабирования: его точка (frameOffset, frameOffset)
  // соответствует точке рамки (0, 0), т.е. scan-координате (-scanLeft, -scanTop).
  // Значит левый верхний угол brushCanvas (0,0) → (-frameOffset - scanLeft, ...).
  tc.drawImage(brushCanvas, -store.frameOffset - scanLeft, -store.frameOffset - scanTop)
  tc.globalCompositeOperation = 'source-over'

  const data = tc.getImageData(0, 0, scanW, scanH).data
  let minX = scanW, minY = scanH, maxX = 0, maxY = 0
  let found = false
  const alphaThreshold = 10
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      if (data[(y * scanW + x) * 4 + 3] >= alphaThreshold) {
        found = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (!found) return { left: 0, top: 0, right: frameSize, bottom: frameSize }

  // Переводим обратно в координаты рамки (frameOffset = 0)
  return {
    left: minX + scanLeft,
    top: minY + scanTop,
    right: maxX + 1 + scanLeft,
    bottom: maxY + 1 + scanTop,
  }
}

export function useExport() {
  const { generateMask } = useAutoMask()
  const { generateBackground } = useAutoBackground()

  async function getMask(frameImg, size) {
    return generateMask(frameImg, size)
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

  // Применяет только цветовые фильтры персонажа (без тени) перед отрисовкой.
  function applyCharFilters(ctx, store, drawFn) {
    ctx.save()
    const filters = []
    if (store.charHue !== 0) filters.push(`hue-rotate(${store.charHue}deg)`)
    if (store.charSaturation !== 100) filters.push(`saturate(${store.charSaturation}%)`)
    if (store.charBrightness !== 100) filters.push(`brightness(${store.charBrightness}%)`)
    if (store.charContrast !== 100) filters.push(`contrast(${store.charContrast}%)`)
    if (filters.length) ctx.filter = filters.join(' ')
    drawFn(ctx)
    ctx.restore()
  }

  // Рисует drawFn на временном canvas размером size×size и обрезает маской.
  // Возвращает обрезанный (не сдвинутый) силуэт — без тени.
  function drawMaskedSilhouette(size, drawFn, maskCanvas, maskX = 0, maskY = 0, maskSize = size) {
    const tmp = document.createElement('canvas')
    tmp.width = size
    tmp.height = size
    const tc = tmp.getContext('2d')
    drawFn(tc)
    tc.globalCompositeOperation = 'destination-in'
    tc.drawImage(maskCanvas, maskX, maskY, maskSize, maskSize)
    tc.globalCompositeOperation = 'source-over'
    return tmp
  }

  // Строит canvas ТОЛЬКО с тенью (без самого силуэта) от переданной формы —
  // тень персонажа целиком, до разрезания по маскам нижнего/верхнего слоя
  // (см. тот же приём в EditorCanvas.vue: buildShadowLayer).
  function buildShadowLayer(store, fullSilhouette, scale) {
    const out = document.createElement('canvas')
    out.width = fullSilhouette.width
    out.height = fullSilhouette.height
    const ctx = out.getContext('2d')

    const sc = store.charShadowColor
    const sr = parseInt(sc.slice(1, 3), 16)
    const sg = parseInt(sc.slice(3, 5), 16)
    const sb = parseInt(sc.slice(5, 7), 16)
    ctx.shadowColor = `rgba(${sr},${sg},${sb},${store.charShadowOpacity / 100})`
    ctx.shadowBlur = store.charShadowBlur * scale
    ctx.shadowOffsetX = store.charShadowOffsetX * scale
    ctx.shadowOffsetY = store.charShadowOffsetY * scale
    ctx.drawImage(fullSilhouette, 0, 0)

    ctx.shadowColor = 'transparent'
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(fullSilhouette, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    return out
  }

  // Обрезает canvas маской (destination-in), возвращает новый canvas того же размера.
  function clipCanvas(source, maskCanvas, maskX = 0, maskY = 0, maskW = source.width, maskH = source.height) {
    const out = document.createElement('canvas')
    out.width = source.width
    out.height = source.height
    const ctx = out.getContext('2d')
    ctx.drawImage(source, 0, 0)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(maskCanvas, maskX, maskY, maskW, maskH)
    ctx.globalCompositeOperation = 'source-over'
    return out
  }

  // Вычисляет запас (в px, в масштабе рамки frameSize) с каждой стороны,
  // необходимый чтобы вместить выступающие за рамку части персонажа, которые
  // реально видны (проявлены кистью «Восстановить»). Части персонажа, выступающие
  // за рамку, но скрытые кистью, не входят — иначе экспорт раздувается на пустое
  // прозрачное место, даже когда на итоговой картинке там ничего не видно.
  function calcOverflow(store, brushCanvas, brushVersion) {
    if (!store.charImage) return 0
    const frameSize = store.canvasSize
    const key = [
      store.charImage, store.charX, store.charY, store.charScale, brushVersion,
    ].join('|')
    if (overflowBoundsCacheKey === key) return overflowBoundsCache

    const bounds = getVisibleOverflowBounds(store, brushCanvas)
    const overLeft   = Math.max(0, -bounds.left)
    const overTop    = Math.max(0, -bounds.top)
    const overRight  = Math.max(0, bounds.right - frameSize)
    const overBottom = Math.max(0, bounds.bottom - frameSize)

    const maxOver = Math.max(overLeft, overTop, overRight, overBottom)
    // Лимит запаса — 2 клетки на сторону (кисть покрывает unbounded-холст 5×5)
    const overflow = Math.min(maxOver, frameSize * 2)

    overflowBoundsCacheKey = key
    overflowBoundsCache = overflow
    return overflow
  }

  // Итоговый множитель экспорта — минимальная степень двойки (1, 2, 4...), при
  // которой выступающие части персонажа умещаются в холст. Рамка остаётся по
  // центру, поэтому запас с каждой стороны = baseSize*(mult-1)/2 должен покрыть
  // overflow. Множитель степенями двойки — чтобы итоговый размер был кратен
  // базовому (512→1024→2048), а не произвольным числом пикселей.
  function calcExportMultiplier(store, baseSize, brushCanvas, brushVersion) {
    const frameSize = store.canvasSize
    const scale = baseSize / frameSize
    const exportOverflow = calcOverflow(store, brushCanvas, brushVersion) * scale
    let mult = 1
    // Запас с каждой стороны при данном множителе: baseSize*(mult-1)/2.
    // Кисть покрывает максимум 2 клетки запаса вокруг рамки (unbounded-холст 5×5),
    // поэтому множитель ограничен ×4 — дальше был бы пустой прозрачный запас.
    while (baseSize * (mult - 1) / 2 < exportOverflow && mult < 4) mult *= 2
    return mult
  }

  async function exportToken(store, brushCanvas, options = {}) {
    const { mode = 'full', printBgColor = null, brushVersion = 0 } = options

    const frameSize = store.canvasSize
    const baseSize = options.size || frameSize
    const scale = baseSize / frameSize
    const mult = calcExportMultiplier(store, baseSize, brushCanvas, brushVersion)
    const exportSize = baseSize * mult
    // Смещение рамки (по центру) в px экспорта и в масштабе рамки — для геометрии кисти
    const exportFrameOffset = (exportSize - baseSize) / 2
    const overflow = exportFrameOffset / scale

    const canvas = document.createElement('canvas')
    canvas.width = exportSize; canvas.height = exportSize
    const ctx = canvas.getContext('2d')

    if (printBgColor && mode === 'full') {
      ctx.fillStyle = printBgColor
      ctx.fillRect(0, 0, exportSize, exportSize)
    }

    const mask = await getMask(store.frameImage, baseSize)

    // Персонаж в координатах экспортного canvas
    const charImg = store.charImage
    const charW = charImg.width * store.charScale
    const charH = charImg.height * store.charScale
    const expCharX = exportFrameOffset + baseSize / 2 + store.charX * scale - charW * scale / 2
    const expCharY = exportFrameOffset + baseSize / 2 + store.charY * scale - charH * scale / 2
    const expCharW = charW * scale
    const expCharH = charH * scale

    // Персонаж в полных координатах (для верхнего слоя, на весь exportSize)
    const drawCharFull = (tc) =>
      applyCharFilters(tc, store, (c) => c.drawImage(charImg, expCharX, expCharY, expCharW, expCharH))

    // Персонаж относительно рамки (для нижнего слоя, на baseSize canvas)
    const drawCharRelative = (tc) =>
      applyCharFilters(tc, store, (c) => c.drawImage(charImg,
        expCharX - exportFrameOffset,
        expCharY - exportFrameOffset,
        expCharW, expCharH,
      ))

    // brushCanvas занимает весь unbounded-холст (frameOffset..+frameSize — клетка рамки).
    // Вырезаем область точно по запасу overflow вокруг рамки (в исходном масштабе холста)
    // и масштабируем её на exportSize — соответствие с expCharX/Y (тот же scale).
    const brushSrcSize = frameSize + overflow * 2
    const brushSrcOffset = store.frameOffset - overflow
    const scaledBrush = document.createElement('canvas')
    scaledBrush.width = exportSize; scaledBrush.height = exportSize
    scaledBrush.getContext('2d').drawImage(
      brushCanvas,
      brushSrcOffset, brushSrcOffset, brushSrcSize, brushSrcSize,
      0, 0, exportSize, exportSize,
    )

    // Нижний силуэт (персонаж × маска1) — обрезан в размере baseSize, без сдвига.
    const bottomSilhouette = drawMaskedSilhouette(baseSize, drawCharRelative, mask)
    // Верхний силуэт (персонаж × brushCanvas) — сразу в размере exportSize.
    const topSilhouette = drawMaskedSilhouette(exportSize, drawCharFull, scaledBrush)

    let shadowBottom = null
    let shadowTop = null
    if (store.charShadowEnabled) {
      // Объединяем оба силуэта в общих координатах exportSize и отбрасываем
      // тень ОДИН раз от целой формы — иначе на границе масок получается
      // разрыв/задвоение тени (см. тот же приём в EditorCanvas.vue).
      const combined = document.createElement('canvas')
      combined.width = exportSize; combined.height = exportSize
      const cctx = combined.getContext('2d')
      cctx.drawImage(bottomSilhouette, exportFrameOffset, exportFrameOffset)
      cctx.drawImage(topSilhouette, 0, 0)

      const fullShadow = buildShadowLayer(store, combined, scale)

      // Нижняя часть тени — видна только в окне рамки (маска1), под рамкой.
      const maskFullCanvas = document.createElement('canvas')
      maskFullCanvas.width = exportSize; maskFullCanvas.height = exportSize
      maskFullCanvas.getContext('2d').drawImage(mask, exportFrameOffset, exportFrameOffset, baseSize, baseSize)
      shadowBottom = clipCanvas(fullShadow, maskFullCanvas)

      // Верхняя часть тени — видна там же, где вылезающий персонаж (scaledBrush), над рамкой.
      shadowTop = clipCanvas(fullShadow, scaledBrush)
    }

    if (mode === 'full') {
      // 1. Фон × маска1 (только в области рамки) — без тени
      if (store.bgType !== 'none') {
        const bgFn = getBgDrawFn(store, baseSize)
        if (bgFn) {
          const bgSilhouette = drawMaskedSilhouette(baseSize, bgFn, mask)
          ctx.drawImage(bgSilhouette, exportFrameOffset, exportFrameOffset)
        }
      }
      // 2. Тень нижнего слоя, затем сам нижний силуэт (без своей тени)
      if (shadowBottom) ctx.drawImage(shadowBottom, 0, 0)
      ctx.drawImage(bottomSilhouette, exportFrameOffset, exportFrameOffset)
      // 3. Рамка
      ctx.drawImage(store.frameImage, exportFrameOffset, exportFrameOffset, baseSize, baseSize)
      // 4. Тень верхнего слоя, затем сам верхний силуэт (без своей тени)
      if (shadowTop) ctx.drawImage(shadowTop, 0, 0)
      ctx.drawImage(topSilhouette, 0, 0)
    } else if (mode === 'char-only') {
      if (shadowBottom) ctx.drawImage(shadowBottom, 0, 0)
      ctx.drawImage(bottomSilhouette, exportFrameOffset, exportFrameOffset)
      if (shadowTop) ctx.drawImage(shadowTop, 0, 0)
      ctx.drawImage(topSilhouette, 0, 0)
    }

    return canvas
  }

  // Скачивает canvas в указанном формате ('png' | 'webp')
  function downloadCanvas(canvas, filename = 'token', format = 'png') {
    const mime = format === 'webp' ? 'image/webp' : 'image/png'
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }, mime)
  }

  function downloadPng(canvas, filename = 'token.png') {
    downloadCanvas(canvas, filename.replace(/\.png$/, ''), 'png')
  }

  // Итоговый размер экспортного холста (px) для заданного базового размера —
  // базовый размер, умноженный на степень двойки (×1/×2/×4), достаточную чтобы
  // вместить выступающие за рамку части персонажа.
  function calcExportSize(store, baseSize, brushCanvas, brushVersion) {
    return baseSize * calcExportMultiplier(store, baseSize, brushCanvas, brushVersion)
  }

  return { exportToken, downloadCanvas, downloadPng, calcExportSize }
}
