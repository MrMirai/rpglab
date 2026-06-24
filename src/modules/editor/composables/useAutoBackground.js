// Процедурная генерация фона: радиальный градиент + сглаженный шум.
// Базовый цвет может автоподбираться из доминирующего цвета рамки.

export function useAutoBackground() {

  // Извлекает доминирующий цвет из непрозрачных пикселей рамки
  function extractColor(frameImg) {
    const s = 50
    const canvas = document.createElement('canvas')
    canvas.width = s; canvas.height = s
    const ctx = canvas.getContext('2d')
    ctx.drawImage(frameImg, 0, 0, s, s)
    const data = ctx.getImageData(0, 0, s, s).data

    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 50) continue // пропускаем прозрачные
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
    }
    if (count === 0) return { r: 40, g: 40, b: 50 }
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    }
  }

  // Сглаженный шум: генерим в низком разрешении, растягиваем с интерполяцией
  function generateNoise(size, grain) {
    const lowRes = Math.max(8, Math.round(size / grain))
    const noiseCanvas = document.createElement('canvas')
    noiseCanvas.width = lowRes; noiseCanvas.height = lowRes
    const nctx = noiseCanvas.getContext('2d')
    const imgData = nctx.createImageData(lowRes, lowRes)
    for (let i = 0; i < lowRes * lowRes; i++) {
      const v = Math.round(Math.random() * 255)
      imgData.data[i * 4] = v
      imgData.data[i * 4 + 1] = v
      imgData.data[i * 4 + 2] = v
      imgData.data[i * 4 + 3] = 255
    }
    nctx.putImageData(imgData, 0, 0)

    const full = document.createElement('canvas')
    full.width = size; full.height = size
    const fctx = full.getContext('2d')
    fctx.imageSmoothingEnabled = true
    fctx.drawImage(noiseCanvas, 0, 0, size, size)
    return full
  }

  // Генерирует фон: радиальный градиент + шум
  function generateBackground(baseColor, options, size = 500) {
    const {
      centerLightness = 0.7,
      edgeLightness = 1.3,
      noiseStrength = 0.15,
      grain = 4,
    } = options

    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')

    const { r, g, b } = baseColor
    const clamp = v => Math.min(255, Math.max(0, Math.round(v)))

    const cx = size / 2, cy = size / 2
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
    grad.addColorStop(0, `rgb(${clamp(r*centerLightness)},${clamp(g*centerLightness)},${clamp(b*centerLightness)})`)
    grad.addColorStop(1, `rgb(${clamp(r*edgeLightness)},${clamp(g*edgeLightness)},${clamp(b*edgeLightness)})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    if (noiseStrength > 0) {
      const noise = generateNoise(size, grain)
      ctx.globalAlpha = noiseStrength
      ctx.globalCompositeOperation = 'overlay'
      ctx.drawImage(noise, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    return canvas
  }

  return { extractColor, generateBackground }
}
