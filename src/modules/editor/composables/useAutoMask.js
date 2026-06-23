// Автоматически генерирует маску из рамки:
// Анализирует альфа-канал рамки, находит внутренний радиус пустой области,
// рисует радиальный градиент маски на offscreen canvas

export function useAutoMask() {
  function generateMask(frameImg, size = 500) {
    // 1. Рисуем рамку на временном canvas
    const tmp = document.createElement('canvas')
    tmp.width = size; tmp.height = size
    const tc = tmp.getContext('2d')
    tc.drawImage(frameImg, 0, 0, size, size)
    const data = tc.getImageData(0, 0, size, size).data

    // 2. Находим минимальный радиус непрозрачных пикселей от центра
    const cx = size / 2, cy = size / 2
    let minR = size / 2
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const alpha = data[(y * size + x) * 4 + 3]
        if (alpha > 30) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
          if (d < minR) minR = d
        }
      }
    }

    // 3. Строим маску: белый круг внутри (персонаж виден), прозрачно снаружи
    const innerR = minR * 0.9
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = size; maskCanvas.height = size
    const mc = maskCanvas.getContext('2d')

    const grad = mc.createRadialGradient(cx, cy, innerR - 10, cx, cy, innerR + 10)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    mc.fillStyle = grad
    mc.arc(cx, cy, size, 0, Math.PI * 2)
    mc.fill()

    return maskCanvas
  }

  return { generateMask }
}
