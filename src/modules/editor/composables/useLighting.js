// Источники света для токена: светящийся объект персонажа (меч, факел) должен
// подсвечивать рамку и самого персонажа.
//
// Свет — это НЕ отдельный видимый слой поверх всего (иначе получился бы туман
// над токеном), а маска освещённости, которая накладывается на уже отрисованный
// слой в режиме 'screen' и обрезается силуэтом этого слоя (destination-in).
// Поэтому свет виден ровно там, где есть освещаемая поверхность: на рамке — по
// пикселям рамки, на персонаже — по пикселям персонажа, а в пустоте ничего не
// подсвечивается.

// Кеш авто-позиции: скан ярких пикселей персонажа дорогой, а зависит только от
// самой картинки — не от положения/масштаба (их учитываем при переводе координат).
const brightSpotCache = new WeakMap()

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

// Находит «центр свечения» картинки — взвешенный по яркости центроид самых
// светлых пикселей. Для персонажа со светящимся мечом это даёт точку на клинке.
// Возвращает координаты в долях размера картинки (0..1), чтобы не зависеть от
// текущего масштаба персонажа.
function findBrightSpot(img) {
  const cached = brightSpotCache.get(img)
  if (cached) return cached

  // Скан по уменьшенной копии: точность в 1-2 пикселя тут не нужна, а полный
  // размер персонажа может быть несколько тысяч пикселей.
  const SCAN = 128
  const scale = Math.min(SCAN / img.width, SCAN / img.height, 1)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const tc = tmp.getContext('2d', { willReadFrequently: true })
  tc.drawImage(img, 0, 0, w, h)
  const data = tc.getImageData(0, 0, w, h).data

  // Первый проход — максимальная яркость среди непрозрачных пикселей.
  let maxLum = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    if (lum > maxLum) maxLum = lum
  }

  // Второй проход — центроид пикселей ярче 80% от максимума. Порог относительный:
  // у тёмного персонажа светящийся меч может быть далеко не белым.
  const threshold = maxLum * 0.8
  let sumX = 0, sumY = 0, sumW = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] < 128) continue
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      if (lum < threshold) continue
      const weight = lum - threshold
      sumX += x * weight
      sumY += y * weight
      sumW += weight
    }
  }

  const spot = sumW > 0
    ? { fx: sumX / sumW / w, fy: sumY / sumW / h }
    : { fx: 0.5, fy: 0.5 }

  brightSpotCache.set(img, spot)
  return spot
}

export function useLighting() {
  // Позиция источника в координатах рамки (0..canvasSize).
  // Для mode==='auto' — точка свечения персонажа с учётом его позиции/масштаба.
  function resolveLightPosition(light, store) {
    if (light.mode !== 'auto' || !store.charImage) {
      return { x: light.x, y: light.y }
    }
    const img = store.charImage
    const { fx, fy } = findBrightSpot(img)
    const charW = img.width * store.charScale
    const charH = img.height * store.charScale
    // Персонаж центрируется в рамке и смещается на charX/charY (см. EditorCanvas)
    const left = store.canvasSize / 2 + store.charX - charW / 2
    const top = store.canvasSize / 2 + store.charY - charH / 2
    return { x: left + fx * charW, y: top + fy * charH }
  }

  // Рисует радиальные градиенты всех активных источников на canvas размера
  // size×size в координатах ПОЛНОГО холста (5×5 клеток).
  // offset — смещение клетки рамки, scale — масштаб относительно store.canvasSize
  // (для экспорта, где размер отличается от рабочего холста).
  // target — 'frame' | 'char': источник учитывается только если включён для этой цели.
  function renderLightMask(store, { size, offset, scale = 1, target }) {
    const active = store.lights.filter((l) => {
      if (!l.visible || l.intensity <= 0 || l.radius <= 0) return false
      return target === 'frame' ? l.onFrame : l.onChar
    })
    if (!active.length) return null

    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')

    // Источники складываются аддитивно: две лампы светят ярче одной.
    ctx.globalCompositeOperation = 'lighter'

    for (const light of active) {
      const pos = resolveLightPosition(light, store)
      const cx = offset + pos.x * scale
      const cy = offset + pos.y * scale
      const radius = light.radius * scale
      const { r, g, b } = hexToRgb(light.color)
      const alpha = light.intensity / 100

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      // falloff управляет тем, насколько далеко от центра держится полная яркость.
      // 0 — свет почти равномерный до края (резкая граница),
      // 100 — быстро гаснет от самого центра (мягкое пятно).
      const soft = light.falloff / 100
      const core = 0.5 * (1 - soft)
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
      grad.addColorStop(core, `rgba(${r},${g},${b},${alpha * 0.75})`)
      grad.addColorStop(Math.min(0.99, core + (1 - core) * 0.55), `rgba(${r},${g},${b},${alpha * 0.28})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'
    return canvas
  }

  // Накладывает свет на уже отрисованный слой и возвращает НОВЫЙ canvas.
  // Свет обрезается силуэтом самого слоя, поэтому не выходит за его пиксели.
  // source не мутируется — вызывающий код кеширует силуэты между кадрами.
  function applyLightToLayer(source, lightMask) {
    if (!lightMask) return source

    // Свет, обрезанный по силуэту слоя: destination-in оставляет от маски света
    // только те пиксели, где слой непрозрачен.
    const lit = document.createElement('canvas')
    lit.width = source.width; lit.height = source.height
    const lctx = lit.getContext('2d')
    lctx.drawImage(lightMask, 0, 0)
    lctx.globalCompositeOperation = 'destination-in'
    lctx.drawImage(source, 0, 0)
    lctx.globalCompositeOperation = 'source-over'

    const out = document.createElement('canvas')
    out.width = source.width; out.height = source.height
    const ctx = out.getContext('2d')
    ctx.drawImage(source, 0, 0)
    // 'screen' осветляет, не выбеливая в ноль: тёмные места набирают свет,
    // уже светлые почти не меняются — физичнее, чем 'lighter'.
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(lit, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    return out
  }

  return { renderLightMask, applyLightToLayer, resolveLightPosition }
}
