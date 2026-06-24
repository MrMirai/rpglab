// Процедурная генерация фона: радиальный градиент + шум (случайный или Перлин).
// Базовый цвет может автоподбираться из доминирующего цвета рамки.

// Шум Перлина с фрактальным суммированием октав (fbm)
class PerlinNoise {
  constructor() {
    const perm = Array.from({ length: 256 }, (_, i) => i)
    // Перемешиваем
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[perm[i], perm[j]] = [perm[j], perm[i]]
    }
    // Дублируем чтобы избежать проверок границ
    this.p = [...perm, ...perm]
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
  lerp(t, a, b) { return a + t * (b - a) }
  grad(hash, x, y) {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return (h & 1 ? -u : u) + (h & 2 ? -v : v)
  }

  noise(x, y) {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const u = this.fade(x)
    const v = this.fade(y)
    const a = this.p[X] + Y
    const b = this.p[X + 1] + Y
    return this.lerp(v,
      this.lerp(u, this.grad(this.p[a], x, y),
                   this.grad(this.p[b], x - 1, y)),
      this.lerp(u, this.grad(this.p[a + 1], x, y - 1),
                   this.grad(this.p[b + 1], x - 1, y - 1))
    )
  }

  // Фрактальный шум (несколько октав для богатой текстуры)
  fbm(x, y, octaves = 4) {
    let val = 0, amp = 0.5, freq = 1, max = 0
    for (let i = 0; i < octaves; i++) {
      val += this.noise(x * freq, y * freq) * amp
      max += amp
      amp *= 0.5
      freq *= 2
    }
    return val / max  // нормализуем в -1..1
  }
}

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

  // Шум: 'random' (сглаженный low-res) или 'perlin' (попиксельный fbm)
  function generateNoise(size, grain, type = 'random') {
    if (type === 'perlin') {
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      const imgData = ctx.createImageData(size, size)
      const perlin = new PerlinNoise()
      const scale = grain / size * 8  // масштаб шума

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const n = perlin.fbm(x * scale, y * scale, 4)
          const v = Math.round((n + 1) / 2 * 255)
          const i = (y * size + x) * 4
          imgData.data[i] = v
          imgData.data[i + 1] = v
          imgData.data[i + 2] = v
          imgData.data[i + 3] = 255
        }
      }
      ctx.putImageData(imgData, 0, 0)
      return canvas

    } else {
      // Случайный шум, сглаженный через low-res + интерполяцию
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
  }

  // Генерирует фон: радиальный градиент + шум
  function generateBackground(baseColor, options, size = 500) {
    const {
      centerLightness = 0.7,
      edgeLightness = 1.3,
      noiseStrength = 0.15,
      grain = 4,
      noiseType = 'perlin',  // 'random' | 'perlin'
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
      const noise = generateNoise(size, grain, noiseType)

      // Модулируем шум радиальной маской: в центре затухает, к краям усиливается
      const modulated = document.createElement('canvas')
      modulated.width = size; modulated.height = size
      const mctx = modulated.getContext('2d')

      mctx.drawImage(noise, 0, 0)

      // Маска: прозрачно в центре → непрозрачно к краям
      const radMask = mctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
      radMask.addColorStop(0, 'rgba(0,0,0,0)')      // центр — шум не виден
      radMask.addColorStop(0.4, 'rgba(0,0,0,0.3)')  // плавный переход
      radMask.addColorStop(1, 'rgba(0,0,0,1)')      // край — полный шум
      mctx.globalCompositeOperation = 'destination-in'
      mctx.fillStyle = radMask
      mctx.fillRect(0, 0, size, size)
      mctx.globalCompositeOperation = 'source-over'

      ctx.globalAlpha = noiseStrength
      ctx.globalCompositeOperation = 'overlay'
      ctx.drawImage(modulated, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    return canvas
  }

  return { extractColor, generateBackground }
}
