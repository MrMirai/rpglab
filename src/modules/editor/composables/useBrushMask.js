import { ref } from 'vue'

// Singleton: один brushCanvas на всё приложение.
// EditorCanvas регистрирует redraw-коллбэк через setRedraw().
// MaskControls вызывает redraw() после пресетов.
//
// Холст кисти занимает весь unbounded-холст (5×5 клеток), а не только клетку
// рамки — персонаж может выходить за пределы рамки на соседние клетки, и кисть
// должна дотягиваться туда же. FRAME_SIZE/GRID_CELLS дублируют константы стора
// (canvasSize/GRID_CELLS), т.к. модуль — синглтон вне компонента и не может
// реактивно читать стор при инициализации.

const FRAME_SIZE = 500
const GRID_CELLS = 5
const SIZE = FRAME_SIZE * GRID_CELLS
const FRAME_OFFSET = FRAME_SIZE * Math.floor(GRID_CELLS / 2)

const brushCanvas = document.createElement('canvas')
brushCanvas.width = SIZE
brushCanvas.height = SIZE
const brushCtx = brushCanvas.getContext('2d')

let _redrawCallback = null
// Монотонный счётчик изменений brushCanvas (реактивный ref) — чтобы computed
// в ExportModal.vue пересчитывал итоговый размер экспорта при рисовании кистью,
// а calcOverflow в useExport.js мог кэшировать дорогой скан alpha-пикселей и
// пересчитывать только когда кисть реально менялась.
const _brushVersion = ref(0)

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
    _brushVersion.value++
  }

  // Разрез считается относительно клетки рамки (FRAME_OFFSET..FRAME_OFFSET+FRAME_SIZE),
  // а не всего unbounded-холста — иначе граница уедет далеко за пределы рамки.
  function fillTop(softness = 60) {
    const splitY = FRAME_OFFSET + FRAME_SIZE * 0.45
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    const grad = brushCtx.createLinearGradient(0, splitY - softness, 0, splitY + softness)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    brushCtx.fillStyle = grad
    brushCtx.fillRect(0, 0, SIZE, splitY + softness)
    _brushVersion.value++
  }

  function fillBottom(softness = 60) {
    const splitY = FRAME_OFFSET + FRAME_SIZE * 0.55
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    const grad = brushCtx.createLinearGradient(0, splitY - softness, 0, splitY + softness)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(1, 'rgba(255,255,255,1)')
    brushCtx.fillStyle = grad
    brushCtx.fillRect(0, splitY - softness, SIZE, SIZE - (splitY - softness))
    _brushVersion.value++
  }

  function fillAll() {
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    brushCtx.fillStyle = 'rgba(255,255,255,1)'
    brushCtx.fillRect(0, 0, SIZE, SIZE)
    _brushVersion.value++
  }

  // Заливает замкнутый Path2D (в координатах полного холста) в brushCanvas.
  // erase=false — добавляет область (белым, «Восстановить»),
  // erase=true — вырезает (destination-out, «Стереть»).
  // ВАЖНО: при destination-out стирается там, где у источника альфа>0, поэтому
  // fillStyle обязан быть непрозрачным (как у кисти-стирания grad с rgba(0,0,0,1)).
  // Без явного fillStyle наследуется прозрачный из прошлого вызова → не стирает.
  function fillPath(path, erase = false) {
    brushCtx.save()
    if (!erase) {
      brushCtx.fillStyle = 'rgba(255,255,255,1)'
      brushCtx.globalCompositeOperation = 'source-over'
    } else {
      brushCtx.fillStyle = 'rgba(0,0,0,1)'
      brushCtx.globalCompositeOperation = 'destination-out'
    }
    brushCtx.fill(path)
    brushCtx.restore()
    _brushVersion.value++
  }

  function clear() {
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    _brushVersion.value++
  }

  // Восстанавливает содержимое brushCanvas из готового изображения (десериализация
  // сохранённого проекта) — заменяет текущую маску целиком, не накладывает поверх.
  function loadFromImage(img) {
    brushCtx.clearRect(0, 0, SIZE, SIZE)
    brushCtx.drawImage(img, 0, 0, SIZE, SIZE)
    _brushVersion.value++
  }

  function setRedraw(fn) { _redrawCallback = fn }
  function redraw() { _redrawCallback?.() }
  function bumpBrushVersion() { _brushVersion.value++ }

  return {
    brushCanvas, paint, fillPath, fillTop, fillBottom, fillAll, clear, loadFromImage,
    setRedraw, redraw, brushVersion: _brushVersion, bumpBrushVersion,
  }
}
