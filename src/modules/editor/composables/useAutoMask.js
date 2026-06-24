// Генерирует маску формы рамки: только внешний flood fill от углов.
// Маска = прозрачные пиксели, недостижимые снаружи (внутри рамки).
// Замкнутые области между щупальцами тоже считаются внутренними.

export function useAutoMask() {
  function floodFill(data, size, startX, startY, alphaThreshold = 30) {
    const visited = new Uint8Array(size * size)
    const startIdx = startY * size + startX

    if (data[startIdx * 4 + 3] >= alphaThreshold) return visited

    const queue = [startIdx]
    visited[startIdx] = 1

    while (queue.length > 0) {
      const idx = queue.pop()
      const x = idx % size
      const y = Math.floor(idx / size)

      const neighbors = [
        (y - 1) * size + x,
        (y + 1) * size + x,
        y * size + (x - 1),
        y * size + (x + 1),
      ]

      for (const nIdx of neighbors) {
        const nx = nIdx % size
        const ny = Math.floor(nIdx / size)
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue
        if (visited[nIdx]) continue
        if (data[nIdx * 4 + 3] >= alphaThreshold) continue
        visited[nIdx] = 1
        queue.push(nIdx)
      }
    }
    return visited
  }

  function generateMask(frameImg, size = 500) {
    const tmp = document.createElement('canvas')
    tmp.width = size; tmp.height = size
    const tc = tmp.getContext('2d')
    tc.drawImage(frameImg, 0, 0, size, size)
    const imageData = tc.getImageData(0, 0, size, size)
    const data = imageData.data

    // Flood fill от всех 4 углов — находим внешнюю область
    const outerFill = new Uint8Array(size * size)
    for (const [ox, oy] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) {
      const cornerVisited = floodFill(data, size, ox, oy)
      for (let i = 0; i < size * size; i++) {
        if (cornerVisited[i]) outerFill[i] = 1
      }
    }

    // Строим маску
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = size; maskCanvas.height = size
    const mc = maskCanvas.getContext('2d')
    const maskData = mc.createImageData(size, size)

    for (let i = 0; i < size * size; i++) {
      const offset = i * 4
      const isFramePixel = data[offset + 3] >= 30
      const isOuter = outerFill[i] === 1

      if (!isFramePixel && !isOuter) {
        // Прозрачный и не достижим снаружи = внутри рамки → белый
        maskData.data[offset]     = 255
        maskData.data[offset + 1] = 255
        maskData.data[offset + 2] = 255
        maskData.data[offset + 3] = 255
      } else {
        maskData.data[offset + 3] = 0
      }
    }

    mc.putImageData(maskData, 0, 0)

    // Dilate: расширяем маску на 3px чтобы фон/персонаж заходили под край рамки
    // и не оставляли ореол на антиалиасинге рамки.
    const dilateAmount = 3
    const dilated = document.createElement('canvas')
    dilated.width = size; dilated.height = size
    const dc = dilated.getContext('2d')

    for (let dy = -dilateAmount; dy <= dilateAmount; dy++) {
      for (let dx = -dilateAmount; dx <= dilateAmount; dx++) {
        if (dx === 0 && dy === 0) continue
        dc.drawImage(maskCanvas, dx, dy)
      }
    }
    dc.drawImage(maskCanvas, 0, 0)  // поверх — оригинал

    return dilated
  }

  return { generateMask }
}
