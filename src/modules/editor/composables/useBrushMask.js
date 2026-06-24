// Singleton: один brushCanvas на всё приложение.
// EditorCanvas регистрирует redraw-коллбэк через setRedraw().
// MaskControls вызывает redraw() после пресетов.

const SIZE = 500
const brushCanvas = document.createElement('canvas')
brushCanvas.width = SIZE
brushCanvas.height = SIZE
const brushCtx = brushCanvas.getContext('2d')

let _redrawCallback = null

export function useBrushMask() {
  function paint(x, y, brushSize, hardness, erase = false) {
    const r = Math.max(brushSize / 2, 1)
    // Внутренний радиус строго меньше внешнего: при r0 === r1 (жёсткость 100)
    // радиальный градиент вырожден и ничего не рисует — оставляем 1% на переход.
    const hard = Math.max(0.01, Math.min(hardness / 100, 0.99))
    const grad = brushCtx.createRadialGradient(x, y, r * hard, x, y, r)
    if (!erase) {
      grad.addColorStop(0, 'rgba(255,255,255,1)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      brushCtx.globalCompositeOperation = 'source-over'
    } else {
      grad.addColorStop(0, 'rgba(0,0,0,1)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      brushCtx.globalCompositeOperation = 'destination-out'
    }
    brushCtx.fillStyle = grad
    brushCtx.beginPath()
    brushCtx.arc(x, y, r, 0, Math.PI * 2)
    brushCtx.fill()
    brushCtx.globalCompositeOperation = 'source-over'
  }

  function fillTop(softness = 60) {
    const splitY = SIZE * 0.45
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    const grad = brushCtx.createLinearGradient(0, splitY - softness, 0, splitY + softness)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    brushCtx.fillStyle = grad
    brushCtx.fillRect(0, 0, SIZE, SIZE)
  }

  function fillBottom(softness = 60) {
    const splitY = SIZE * 0.55
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    const grad = brushCtx.createLinearGradient(0, splitY - softness, 0, splitY + softness)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(1, 'rgba(255,255,255,1)')
    brushCtx.fillStyle = grad
    brushCtx.fillRect(0, 0, SIZE, SIZE)
  }

  function fillAll() {
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    brushCtx.fillStyle = 'rgba(255,255,255,1)'
    brushCtx.fillRect(0, 0, SIZE, SIZE)
  }

  function clear() {
    brushCtx.clearRect(0, 0, SIZE, SIZE)
  }

  function setRedraw(fn) { _redrawCallback = fn }
  function redraw() { _redrawCallback?.() }

  return { brushCanvas, paint, fillTop, fillBottom, fillAll, clear, setRedraw, redraw }
}
