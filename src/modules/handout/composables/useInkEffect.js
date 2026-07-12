// Эффект «вписанности» элемента в бумагу (el.inkStrength 0..100).
// Имитирует нанесённую на лист краску тремя слагаемыми:
//  1) multiply-наложение (см. effectiveBlendOp в HandoutCanvas) — фактура
//     бумаги просвечивает сквозь краску;
//  2) зерно бумаги «выедает» альфу элемента (этот фильтр) — неравномерный
//     прижим пера/штампа: на буграх бумаги краска не легла;
//  3) рваный контур — у полупрозрачных (антиалиасных) краевых пикселей эрозия
//     усилена: край штриха ложится по волокнам неровно.
// ВАЖНО: Konva.Filters.Blur для «растекания» НЕ используется — его stack-blur
// на прозрачных краях даёт светлый ореол вокруг глифов (проверено на текстуре
// бумаги: вокруг букв выедалась фактура фона), а сам текст мылился.
// Konva-фильтры работают только на закешированном узле (node.cache()) — это
// единственный способ изолировать пиксели элемента: правь мы альфу через
// destination-out прямо на слое, прожгли бы фон под элементом.

const TILE = 256

// Тайл зерна бумаги TILE×TILE (Uint8, бесшовно тайлится по модулю).
// Два слоя: низкочастотный (билинейно растянутая сетка 64×64 — «волокна»,
// пятна ~4px) + пиксельный шум («пыль»). Детерминированный LCG вместо
// Math.random — зерно одинаково между сессиями/перерисовками.
let noiseTile = null

function getNoiseTile() {
  if (noiseTile) return noiseTile
  let seed = 1234567
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  const GRID = 64
  const grid = new Float32Array(GRID * GRID)
  for (let i = 0; i < grid.length; i++) grid[i] = rnd()

  noiseTile = new Uint8Array(TILE * TILE)
  const f = GRID / TILE
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const gx = x * f
      const gy = y * f
      const x0 = Math.floor(gx)
      const y0 = Math.floor(gy)
      const tx = gx - x0
      const ty = gy - y0
      const x1 = (x0 + 1) % GRID
      const y1 = (y0 + 1) % GRID
      const low =
        grid[y0 * GRID + x0] * (1 - tx) * (1 - ty) +
        grid[y0 * GRID + x1] * tx * (1 - ty) +
        grid[y1 * GRID + x0] * (1 - tx) * ty +
        grid[y1 * GRID + x1] * tx * ty
      noiseTile[y * TILE + x] = Math.min(255, Math.round((low * 0.65 + rnd() * 0.35) * 255))
    }
  }
  return noiseTile
}

// Стабильный сид зерна из id элемента — у каждого элемента свой сдвиг выборки
// тайла, чтобы два соседних текста не имели одинаковый узор пропусков.
export function inkSeedFromId(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h & 0xffff
}

// Konva-фильтр. Читает атрибуты узла:
//  inkStrength (0..1), inkSeed (сид), inkPixelRatio (pixelRatio кеша —
//  imageData в кеш-пикселях, а зерно должно быть в «бумажных» px документа,
//  иначе при зуме/экспорте меняется размер крапинок).
// Модель: порог выедания опускается с силой — сначала краска пропадает только
// на самых высоких «буграх» шума, к 100% — почти на половине площади; плюс
// мягкая общая неравномерность прозрачности по всему пятну.
export function inkGrainFilter(imageData) {
  const strength = this.getAttr('inkStrength') || 0
  if (strength <= 0) return
  const ratio = this.getAttr('inkPixelRatio') || 1
  const seed = this.getAttr('inkSeed') || 0
  const tile = getNoiseTile()
  const { data, width, height } = imageData

  const sx = seed & 255
  const sy = (seed >> 8) & 255
  const threshold = 1 - 0.5 * strength
  const SOFT = 0.22 // ширина переходной зоны порога (мягкие края пропусков)

  for (let y = 0; y < height; y++) {
    const rowOff = (((y / ratio) | 0) + sy) & 255
    const rowBase = y * width
    for (let x = 0; x < width; x++) {
      const aIdx = (rowBase + x) * 4 + 3
      const a = data[aIdx]
      if (a === 0) continue
      const n = tile[rowOff * TILE + ((((x / ratio) | 0) + sx) & 255)] / 255
      // Рваный контур: антиалиасные (полупрозрачные) пиксели — это края
      // штрихов, их выедаем сильнее, чтобы кромка легла по волокнам неровно
      const edge = 1 + 0.7 * (1 - a / 255)
      let k
      if (n > threshold) {
        const e = Math.min(1, (n - threshold) / SOFT)
        k = 1 - Math.min(1, strength * 0.9 * e * edge)
      } else {
        k = 1 - strength * 0.15 * n * edge
      }
      if (k < 1) data[aIdx] = k <= 0 ? 0 : (a * k) | 0
    }
  }
}
