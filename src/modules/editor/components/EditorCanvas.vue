<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../store'
import { useAutoMask } from '../composables/useAutoMask'
import { useBrushMask } from '../composables/useBrushMask'
import { useAutoBackground } from '../composables/useAutoBackground'
import { useHistory } from '../composables/useHistory'
import { useEditorBridge } from '../composables/useEditorBridge'
import ZoomNavigator from '@/shared/components/ZoomNavigator.vue'

const store = useEditorStore()
const { generateMask } = useAutoMask()
const { brushCanvas, paint, setRedraw, bumpBrushVersion } = useBrushMask()
const { generateBackground } = useAutoBackground()
const history = useHistory()
const bridge = useEditorBridge()

const containerRef = ref(null)
const stageRef = ref(null)
const bgLayer = ref(null)
const charBottomLayer = ref(null)
const frameLayer = ref(null)
const charTopLayer = ref(null)
const overlayLayer = ref(null)

const containerW = ref(0)
const containerH = ref(0)

// Вьюпорт холста (pan/zoom сцены, не персонажа)
const viewX = ref(0)
const viewY = ref(0)
const viewZoom = ref(1)

// Показывает весь 5×5 холст целиком
function centerView() {
  const padding = 40
  const scaleX = (containerW.value - padding * 2) / store.fullCanvasSize
  const scaleY = (containerH.value - padding * 2) / store.fullCanvasSize
  viewZoom.value = Math.min(scaleX, scaleY)
  viewX.value = (containerW.value - store.fullCanvasSize * viewZoom.value) / 2
  viewY.value = (containerH.value - store.fullCanvasSize * viewZoom.value) / 2
}

// Начальный вид: рамка + 1 клетка вокруг (видно 3×3 клетки)
function centerViewOnFrame() {
  if (!containerW.value || !containerH.value) return
  const padding = 40
  const visibleSize = store.canvasSize * 3
  const scale = Math.min(
    (containerW.value - padding * 2) / visibleSize,
    (containerH.value - padding * 2) / visibleSize,
  )
  viewZoom.value = scale
  const frameCenter = store.frameOffset + store.canvasSize / 2
  viewX.value = containerW.value / 2 - frameCenter * scale
  viewY.value = containerH.value / 2 - frameCenter * scale
}

const stageConfig = computed(() => ({
  width: containerW.value || store.fullCanvasSize,
  height: containerH.value || store.fullCanvasSize,
  scaleX: viewZoom.value,
  scaleY: viewZoom.value,
  x: viewX.value,
  y: viewY.value,
}))

const charW = computed(() =>
  store.charImage ? store.charImage.width * store.charScale : 0
)
const charH = computed(() =>
  store.charImage ? store.charImage.height * store.charScale : 0
)
// Координаты персонажа в пространстве полного холста
const charDrawX = computed(() =>
  store.frameOffset + store.canvasSize / 2 + store.charX - charW.value / 2
)
const charDrawY = computed(() =>
  store.frameOffset + store.canvasSize / 2 + store.charY - charH.value / 2
)

const bgCanvas = ref(null)
const charBottomCanvas = ref(null)
const charTopCanvas = ref(null)
const overlayCanvas = ref(null)

// Кеш дорогого авто-фона: пересчитываем только при смене bg-параметров,
// а не на каждый ререндер (renderBg вызывается при каждом движении персонажа).
let autoBgCache = null
let autoBgKey = ''

function getAutoBg(size) {
  const key = [
    store.bgAutoColor, store.bgCenterLight, store.bgEdgeLight,
    store.bgNoiseStrength, store.bgGrain, store.bgNoiseType, size,
  ].join('|')
  if (autoBgCache && autoBgKey === key) return autoBgCache

  const hex = store.bgAutoColor.replace('#', '')
  const baseColor = {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
  autoBgCache = generateBackground(baseColor, {
    centerLightness: store.bgCenterLight,
    edgeLightness: store.bgEdgeLight,
    noiseStrength: store.bgNoiseStrength / 100,
    grain: store.bgGrain,
    noiseType: store.bgNoiseType,
  }, size)
  autoBgKey = key
  return autoBgCache
}

function renderBg() {
  const fullSize = store.fullCanvasSize
  const frameSize = store.canvasSize
  const offset = store.frameOffset

  if (store.bgType === 'none') { bgCanvas.value = null; return }

  // Рендерим фон в размере рамки
  const bgC = document.createElement('canvas')
  bgC.width = frameSize; bgC.height = frameSize
  const btx = bgC.getContext('2d')

  if (store.bgType === 'color') {
    btx.fillStyle = store.bgColor
    btx.fillRect(0, 0, frameSize, frameSize)
  } else if (store.bgType === 'image' && store.bgImage) {
    const img = store.bgImage
    const scale = Math.max(frameSize / img.width, frameSize / img.height)
    const sw = img.width * scale
    const sh = img.height * scale
    const sx = (frameSize - sw) / 2
    const sy = (frameSize - sh) / 2
    btx.drawImage(img, sx, sy, sw, sh)
  } else if (store.bgType === 'auto') {
    btx.drawImage(getAutoBg(frameSize), 0, 0)
  }

  // Обрезаем маской формы рамки
  const mask = store.maskImage || (store.frameImage ? generateMask(store.frameImage, frameSize) : null)
  if (mask) {
    btx.globalCompositeOperation = 'destination-in'
    btx.drawImage(mask, 0, 0, frameSize, frameSize)
    btx.globalCompositeOperation = 'source-over'
  }

  // Помещаем на полный холст со смещением центральной клетки
  const bgFull = document.createElement('canvas')
  bgFull.width = fullSize; bgFull.height = fullSize
  bgFull.getContext('2d').drawImage(bgC, offset, offset)
  bgCanvas.value = bgFull
}

// Собирает CSS-строку фильтра персонажа из параметров стора
function buildCharFilter() {
  const filters = []
  if (store.charHue !== 0)
    filters.push(`hue-rotate(${store.charHue}deg)`)
  if (store.charSaturation !== 100)
    filters.push(`saturate(${store.charSaturation}%)`)
  if (store.charBrightness !== 100)
    filters.push(`brightness(${store.charBrightness}%)`)
  if (store.charContrast !== 100)
    filters.push(`contrast(${store.charContrast}%)`)
  return filters.length ? filters.join(' ') : 'none'
}

// Рисует персонажа с фильтрами и тенью на переданном контексте
function renderCharWithFilters(targetCtx, x, y, w, h) {
  const filter = buildCharFilter()
  targetCtx.save()

  if (store.charShadowEnabled) {
    const shadowOpacity = store.charShadowOpacity / 100
    const sc = store.charShadowColor
    const sr = parseInt(sc.slice(1, 3), 16)
    const sg = parseInt(sc.slice(3, 5), 16)
    const sb = parseInt(sc.slice(5, 7), 16)
    targetCtx.shadowColor = `rgba(${sr},${sg},${sb},${shadowOpacity})`
    targetCtx.shadowBlur = store.charShadowBlur
    targetCtx.shadowOffsetX = store.charShadowOffsetX
    targetCtx.shadowOffsetY = store.charShadowOffsetY
  }

  if (filter !== 'none') targetCtx.filter = filter
  targetCtx.drawImage(store.charImage, x, y, w, h)
  targetCtx.restore()
}

function renderOffscreen() {
  renderBg()

  const fullSize = store.fullCanvasSize
  const frameSize = store.canvasSize
  const offset = store.frameOffset

  // --- Нижний слой: персонаж × маска1 (только в области рамки) ---
  const maskedChar = document.createElement('canvas')
  maskedChar.width = frameSize; maskedChar.height = frameSize
  const mc = maskedChar.getContext('2d')
  // Рисуем относительно рамки (вычитаем frameOffset)
  renderCharWithFilters(mc, charDrawX.value - offset, charDrawY.value - offset, charW.value, charH.value)

  const mask = store.maskImage || (store.frameImage ? generateMask(store.frameImage, frameSize) : null)
  if (mask) {
    mc.globalCompositeOperation = 'destination-in'
    mc.drawImage(mask, 0, 0, frameSize, frameSize)
    mc.globalCompositeOperation = 'source-over'
  }

  const bottomC = document.createElement('canvas')
  bottomC.width = fullSize; bottomC.height = fullSize
  bottomC.getContext('2d').drawImage(maskedChar, offset, offset)
  charBottomCanvas.value = bottomC

  // --- Верхний слой: персонаж × brushCanvas (на весь холст) ---
  const topC = document.createElement('canvas')
  topC.width = fullSize; topC.height = fullSize
  const ttx = topC.getContext('2d')
  // Персонаж в полных координатах (charDrawX/Y уже включают frameOffset)
  renderCharWithFilters(ttx, charDrawX.value, charDrawY.value, charW.value, charH.value)

  // brushCanvas уже размером с весь холст (fullSize) — рисуем как есть
  ttx.globalCompositeOperation = 'destination-in'
  ttx.drawImage(brushCanvas, 0, 0)
  ttx.globalCompositeOperation = 'source-over'
  charTopCanvas.value = topC
}

function renderOverlay() {
  const fullSize = store.fullCanvasSize

  const oc = document.createElement('canvas')
  oc.width = fullSize; oc.height = fullSize
  const octx = oc.getContext('2d')

  if (store.showMaskOverlay) {
    // Янтарный оверлей на весь холст: скрытые области кисти
    octx.fillStyle = 'rgba(196, 149, 74, 0.45)'
    octx.fillRect(0, 0, fullSize, fullSize)
    octx.globalCompositeOperation = 'destination-out'
    octx.drawImage(brushCanvas, 0, 0)
    octx.globalCompositeOperation = 'source-over'
  } else if (store.showFrontOnly) {
    // Шахматный фон через паттерн
    const tile = document.createElement('canvas')
    tile.width = 32; tile.height = 32
    const tc = tile.getContext('2d')
    tc.fillStyle = '#2b2b36'
    tc.fillRect(0, 0, 16, 16)
    tc.fillRect(16, 16, 16, 16)
    tc.fillStyle = '#21212a'
    tc.fillRect(16, 0, 16, 16)
    tc.fillRect(0, 16, 16, 16)
    const pattern = octx.createPattern(tile, 'repeat')
    octx.fillStyle = pattern
    octx.fillRect(0, 0, fullSize, fullSize)

    octx.fillStyle = 'rgba(0,0,0,0.75)'
    octx.fillRect(0, 0, fullSize, fullSize)

    if (charTopCanvas.value) {
      octx.globalCompositeOperation = 'source-over'
      octx.drawImage(charTopCanvas.value, 0, 0)
    }
  }

  overlayCanvas.value = oc
  nextTick(() => overlayLayer.value?.getNode()?.batchDraw())
}

function redrawAll() {
  renderOffscreen()
  renderOverlay()
  nextTick(() => {
    bgLayer.value?.getNode()?.batchDraw()
    charBottomLayer.value?.getNode()?.batchDraw()
    charTopLayer.value?.getNode()?.batchDraw()
  })
}

setRedraw(() => redrawAll())

// --- История действий ---
function takeSnapshot() {
  const size = store.fullCanvasSize
  const snap = document.createElement('canvas')
  snap.width = size; snap.height = size
  snap.getContext('2d').drawImage(brushCanvas, 0, 0)

  return {
    charX: store.charX,
    charY: store.charY,
    charScale: store.charScale,
    bgType: store.bgType,
    bgColor: store.bgColor,
    bgAutoColor: store.bgAutoColor,
    bgCenterLight: store.bgCenterLight,
    bgEdgeLight: store.bgEdgeLight,
    bgNoiseStrength: store.bgNoiseStrength,
    bgGrain: store.bgGrain,
    bgNoiseType: store.bgNoiseType,
    brushSnapshot: snap,
  }
}

function applySnapshot(snapshot) {
  store.setCharPosition(snapshot.charX, snapshot.charY)
  store.setCharScale(snapshot.charScale)
  store.setBgType(snapshot.bgType)
  store.setBgColor(snapshot.bgColor)
  store.setBgAutoColor(snapshot.bgAutoColor)
  store.bgCenterLight = snapshot.bgCenterLight
  store.bgEdgeLight = snapshot.bgEdgeLight
  store.bgNoiseStrength = snapshot.bgNoiseStrength
  store.bgGrain = snapshot.bgGrain
  store.setBgNoiseType(snapshot.bgNoiseType)

  const size = store.fullCanvasSize
  const bctx = brushCanvas.getContext('2d')
  bctx.clearRect(0, 0, size, size)
  bctx.drawImage(snapshot.brushSnapshot, 0, 0)
  bumpBrushVersion()
}

function recordHistory() {
  history.push(takeSnapshot())
  store.setUndoRedo(history.canUndo(), history.canRedo())
}

function performUndo() {
  if (!history.canUndo()) return
  const snapshot = history.undo(takeSnapshot())
  if (snapshot) {
    applySnapshot(snapshot)
    store.setUndoRedo(history.canUndo(), history.canRedo())
    redrawAll()
  }
}

function performRedo() {
  if (!history.canRedo()) return
  const snapshot = history.redo(takeSnapshot())
  if (snapshot) {
    applySnapshot(snapshot)
    store.setUndoRedo(history.canUndo(), history.canRedo())
    redrawAll()
  }
}

bridge.setHandlers({
  centerView: () => centerViewOnFrame(),
  recordHistory,
  performUndo,
  performRedo,
})

watch(
  [() => store.showMaskOverlay, () => store.showFrontOnly],
  () => renderOverlay(),
)

// При загрузке рамки — возвращаемся к виду рамки
watch(() => store.frameImage, (img) => {
  if (img) nextTick(() => centerViewOnFrame())
})

// Смена инструмента — запускаем/останавливаем визуализацию курсора кисти.
// Размер/жёсткость читаются из store прямо в анимационном loop, отдельный watch не нужен.
watch(() => store.activeTool, (tool) => {
  if (tool === 'erase' || tool === 'restore') {
    if (isCursorVisible) {
      startCursorAnim()
      if (containerRef.value) containerRef.value.style.cursor = 'none'
    }
  } else if (tool === 'hand') {
    stopCursorAnim()
    setCursor('grab')
  } else {
    stopCursorAnim()
    if (containerRef.value) containerRef.value.style.cursor = ''
  }
})

watchEffect(() => {
  const img = store.charImage
  const frameImg = store.frameImage
  const x = store.charX
  const y = store.charY
  const scale = store.charScale
  const maskImg = store.maskImage
  const mv = store.maskVersion
  const bt = store.bgType
  const bc = store.bgColor
  const bi = store.bgImage
  const bac = store.bgAutoColor
  const bcl = store.bgCenterLight
  const bel = store.bgEdgeLight
  const bns = store.bgNoiseStrength
  const bgr = store.bgGrain
  const bnt = store.bgNoiseType
  // Фильтры персонажа — пересобираем слои при изменении
  const fHue = store.charHue
  const fSat = store.charSaturation
  const fBri = store.charBrightness
  const fCon = store.charContrast
  const shEn = store.charShadowEnabled
  const shCol = store.charShadowColor
  const shBlur = store.charShadowBlur
  const shOx = store.charShadowOffsetX
  const shOy = store.charShadowOffsetY
  const shOp = store.charShadowOpacity

  if (!img) {
    // Фон может быть без персонажа
    renderBg()
    nextTick(() => bgLayer.value?.getNode()?.batchDraw())
    return
  }
  renderOffscreen()
  renderOverlay()

  nextTick(() => {
    bgLayer.value?.getNode()?.batchDraw()
    charBottomLayer.value?.getNode()?.batchDraw()
    charTopLayer.value?.getNode()?.batchDraw()
  })
})

const charBottomConfig = computed(() => ({
  image: charBottomCanvas.value,
  x: 0, y: 0,
  width: store.fullCanvasSize,
  height: store.fullCanvasSize,
  listening: false,
}))

const charTopConfig = computed(() => ({
  image: charTopCanvas.value,
  x: 0, y: 0,
  width: store.fullCanvasSize,
  height: store.fullCanvasSize,
  listening: false,
}))

const frameConfig = computed(() => ({
  image: store.frameImage,
  x: store.frameOffset,
  y: store.frameOffset,
  width: store.canvasSize,
  height: store.canvasSize,
}))

// Сетка 5×5 клеток
const gridLinesH = computed(() => {
  const lines = []
  const full = store.fullCanvasSize
  const cell = store.canvasSize
  for (let i = 0; i <= store.GRID_CELLS; i++) {
    lines.push({ points: [0, i * cell, full, i * cell] })
  }
  return lines
})
const gridLinesV = computed(() => {
  const lines = []
  const full = store.fullCanvasSize
  const cell = store.canvasSize
  for (let i = 0; i <= store.GRID_CELLS; i++) {
    lines.push({ points: [i * cell, 0, i * cell, full] })
  }
  return lines
})
// Подсветка центральной клетки (рамки)
const centerCellConfig = computed(() => ({
  x: store.frameOffset,
  y: store.frameOffset,
  width: store.canvasSize,
  height: store.canvasSize,
  fill: 'rgba(196, 149, 74, 0.08)',
  stroke: 'rgba(196, 149, 74, 0.5)',
  strokeWidth: 1,
  listening: false,
}))

function setCursor(cursor) {
  if (!containerRef.value) return
  const tool = store.activeTool
  // В режиме кисти системный курсор скрыт — рисуем свой
  if (tool === 'erase' || tool === 'restore') {
    containerRef.value.style.cursor = 'none'
    return
  }
  if (tool === 'hand') {
    containerRef.value.style.cursor = isPanning ? 'grabbing' : 'grab'
    return
  }
  containerRef.value.style.cursor = cursor
}

// --- Визуализация курсора кисти (обычный HTML canvas поверх Konva) ---
const cursorCanvasRef = ref(null)
let cursorX = 0
let cursorY = 0
let isCursorVisible = false
let cursorDashOffset = 0
let cursorAnimFrame = null

function drawBrushCursor(x, y) {
  const canvas = cursorCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!isCursorVisible) return
  const tool = store.activeTool
  if (tool !== 'erase' && tool !== 'restore') return

  // Радиус кисти в экранных координатах (с учётом zoom вьюпорта)
  const screenR = (store.brushSize / 2) * viewZoom.value
  const hard = store.brushHardness / 100
  const coreR = screenR * hard

  // Градиентное ядро — зона жёсткости
  if (coreR > 1) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, screenR)
    if (tool === 'restore') {
      grad.addColorStop(0, 'rgba(196, 149, 74, 0.35)')
      grad.addColorStop(hard, 'rgba(196, 149, 74, 0.35)')
      grad.addColorStop(1, 'rgba(196, 149, 74, 0)')
    } else {
      grad.addColorStop(0, 'rgba(192, 84, 74, 0.35)')
      grad.addColorStop(hard, 'rgba(192, 84, 74, 0.35)')
      grad.addColorStop(1, 'rgba(192, 84, 74, 0)')
    }
    ctx.beginPath()
    ctx.arc(x, y, screenR, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }

  // Пунктирная граница — полный радиус кисти
  ctx.beginPath()
  ctx.arc(x, y, screenR, 0, Math.PI * 2)
  ctx.strokeStyle = tool === 'restore'
    ? 'rgba(196, 149, 74, 0.9)'
    : 'rgba(192, 84, 74, 0.9)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.lineDashOffset = -cursorDashOffset
  ctx.stroke()
  ctx.setLineDash([])
}

function startCursorAnim() {
  if (cursorAnimFrame) return
  function tick() {
    cursorDashOffset = (cursorDashOffset + 0.3) % 16
    drawBrushCursor(cursorX, cursorY)
    cursorAnimFrame = requestAnimationFrame(tick)
  }
  cursorAnimFrame = requestAnimationFrame(tick)
}

function stopCursorAnim() {
  if (cursorAnimFrame) {
    cancelAnimationFrame(cursorAnimFrame)
    cursorAnimFrame = null
  }
  const canvas = cursorCanvasRef.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
}

function getCanvasPos(stage) {
  const pos = stage.getPointerPosition()
  return {
    x: (pos.x - viewX.value) / viewZoom.value,
    y: (pos.y - viewY.value) / viewZoom.value,
  }
}

let isPainting = false
let isDragging = false
let isPanning = false
let isSpaceDown = false
let dragStart = { x: 0, y: 0 }
let dragStartChar = { x: 0, y: 0 }
let panStart = { x: 0, y: 0 }
let panStartView = { x: 0, y: 0 }

let ro = null

onMounted(() => {
  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    containerW.value = width
    containerH.value = height
    centerViewOnFrame()
  })
  ro.observe(containerRef.value)
  containerW.value = containerRef.value.offsetWidth
  containerH.value = containerRef.value.offsetHeight
  centerViewOnFrame()

  containerRef.value.setAttribute('tabindex', '0')
  containerRef.value.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault()
      isSpaceDown = true
      setCursor('grab')
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
      e.preventDefault()
      performUndo()
    }
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
      e.preventDefault()
      performRedo()
    }
  })
  containerRef.value.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpaceDown = false
      isPanning = false
      setCursor(store.activeTool === 'move' ? 'grab' : 'crosshair')
    }
  })
  containerRef.value.addEventListener('mousemove', (e) => {
    const rect = containerRef.value.getBoundingClientRect()
    cursorX = e.clientX - rect.left
    cursorY = e.clientY - rect.top
  })

  containerRef.value.addEventListener('mouseenter', () => {
    containerRef.value.focus({ preventScroll: true })
    isCursorVisible = true
    const tool = store.activeTool
    if (tool === 'erase' || tool === 'restore') {
      startCursorAnim()
      containerRef.value.style.cursor = 'none'
    }
  })

  containerRef.value.addEventListener('mouseleave', () => {
    isCursorVisible = false
    stopCursorAnim()
    containerRef.value.style.cursor = ''
  })

  const stage = stageRef.value?.getStage()
  if (!stage) return

  stage.on('mousedown', () => {
    const tool = store.activeTool
    const pos = stage.getPointerPosition()

    if (isSpaceDown) {
      isPanning = true
      panStart = { x: pos.x, y: pos.y }
      panStartView = { x: viewX.value, y: viewY.value }
      setCursor('grabbing')
      return
    }

    if (tool === 'hand') {
      isPanning = true
      panStart = { x: pos.x, y: pos.y }
      panStartView = { x: viewX.value, y: viewY.value }
      setCursor('grabbing')
      return
    }

    const canvasPos = getCanvasPos(stage)

    if (tool === 'move') {
      recordHistory()
      isDragging = true
      dragStart = canvasPos
      dragStartChar = { x: store.charX, y: store.charY }
      setCursor('grabbing')
    } else if ((tool === 'erase' || tool === 'restore') && store.isReady) {
      recordHistory()
      isPainting = true
      // brushCanvas теперь занимает весь холст — координаты передаём как есть
      paint(canvasPos.x, canvasPos.y, store.brushSize, store.brushHardness, tool === 'erase')
      redrawAll()
    }
  })

  stage.on('mousemove', () => {
    const tool = store.activeTool
    const pos = stage.getPointerPosition()

    if (isPanning) {
      viewX.value = panStartView.x + (pos.x - panStart.x)
      viewY.value = panStartView.y + (pos.y - panStart.y)
      return
    }

    const canvasPos = getCanvasPos(stage)

    if (tool === 'hand') {
      setCursor('grab')
      return
    }

    if (tool === 'move') {
      if (!isDragging) { setCursor('grab'); return }
      store.setCharPosition(
        Math.round(dragStartChar.x + (canvasPos.x - dragStart.x)),
        Math.round(dragStartChar.y + (canvasPos.y - dragStart.y)),
      )
    } else if ((tool === 'erase' || tool === 'restore') && isPainting) {
      paint(canvasPos.x, canvasPos.y, store.brushSize, store.brushHardness, tool === 'erase')
      redrawAll()
    }
  })

  stage.on('mouseup', () => {
    const tool = store.activeTool
    isPanning = false
    isPainting = false
    isDragging = false
    if (isSpaceDown) { setCursor('grab'); return }
    if (tool === 'hand') setCursor('grab')
    else if (tool === 'move') setCursor('grab')
    else setCursor('crosshair')
  })

  stage.on('mouseleave', () => {
    isPanning = false
    isPainting = false
    isDragging = false
    setCursor('default')
  })

  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const pos = stage.getPointerPosition()
    const tool = store.activeTool

    if (e.evt.ctrlKey || e.evt.metaKey) {
      if (tool === 'erase' || tool === 'restore') {
        // Ctrl+колёсико в режиме кисти — меняем размер кисти
        const dir = e.evt.deltaY > 0 ? -1 : 1
        const step = Math.max(1, Math.round(store.brushSize * 0.08))
        store.brushSize = Math.min(200, Math.max(5, store.brushSize + dir * step))
        drawBrushCursor(cursorX, cursorY)
      } else {
        // Ctrl+колёсико в остальных инструментах — zoom вьюпорта
        const zoomFactor = e.evt.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.min(8, Math.max(0.1, viewZoom.value * zoomFactor))
        viewX.value = pos.x - (pos.x - viewX.value) * (newZoom / viewZoom.value)
        viewY.value = pos.y - (pos.y - viewY.value) * (newZoom / viewZoom.value)
        viewZoom.value = newZoom
      }
    } else if (isSpaceDown || tool === 'hand') {
      // Пробел+колёсико или hand tool — zoom вьюпорта
      const zoomFactor = e.evt.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(8, Math.max(0.1, viewZoom.value * zoomFactor))
      viewX.value = pos.x - (pos.x - viewX.value) * (newZoom / viewZoom.value)
      viewY.value = pos.y - (pos.y - viewY.value) * (newZoom / viewZoom.value)
      viewZoom.value = newZoom
    } else if (tool === 'move') {
      // Колёсико без модификаторов в move — zoom персонажа
      const delta = e.evt.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.min(10, Math.max(0.05, store.charScale + delta))
      store.setCharScale(Math.round(newScale * 100) / 100)
    }
  })
})

function onZoomSlider(val) {
  const cx = containerW.value / 2
  const cy = containerH.value / 2
  viewX.value = cx - (cx - viewX.value) * (val / viewZoom.value)
  viewY.value = cy - (cy - viewY.value) * (val / viewZoom.value)
  viewZoom.value = val
}
function zoomIn() { onZoomSlider(Math.min(8, viewZoom.value * 1.2)) }
function zoomOut() { onZoomSlider(Math.max(0.1, viewZoom.value / 1.2)) }

onUnmounted(() => {
  ro?.disconnect()
  stopCursorAnim()
})
</script>

<template>
  <div class="editor-canvas" ref="containerRef">
    <v-stage :config="stageConfig" ref="stageRef">

      <!-- Слой 0: фон токена -->
      <v-layer ref="bgLayer">
        <v-image
          v-if="bgCanvas"
          :config="{ image: bgCanvas, x: 0, y: 0, width: store.fullCanvasSize, height: store.fullCanvasSize, listening: false }"
        />
      </v-layer>

      <!-- Слой 1: персонаж ЗА рамкой -->
      <v-layer ref="charBottomLayer">
        <v-image
          v-if="store.hasChar"
          :config="charBottomConfig"
        />
      </v-layer>

      <!-- Слой 2: рамка + сетка -->
      <v-layer ref="frameLayer">
        <v-image
          v-if="store.hasFrame"
          :config="frameConfig"
        />
        <template v-if="store.showGrid">
          <!-- Подсветка центральной клетки -->
          <v-rect :config="centerCellConfig" />
          <!-- Горизонтальные линии -->
          <v-line
            v-for="(line, i) in gridLinesH" :key="'h' + i"
            :config="{ ...line, stroke: 'rgba(255,255,255,0.08)', strokeWidth: 0.5 }"
          />
          <!-- Вертикальные линии -->
          <v-line
            v-for="(line, i) in gridLinesV" :key="'v' + i"
            :config="{ ...line, stroke: 'rgba(255,255,255,0.08)', strokeWidth: 0.5 }"
          />
        </template>
      </v-layer>

      <!-- Слой 3: персонаж НАД рамкой -->
      <v-layer ref="charTopLayer">
        <v-image
          v-if="store.hasChar"
          :config="charTopConfig"
        />
      </v-layer>

      <!-- Слой 4: оверлей режимов отображения -->
      <v-layer ref="overlayLayer">
        <v-image
          v-if="overlayCanvas && (store.showMaskOverlay || store.showFrontOnly)"
          :config="{ image: overlayCanvas, x: 0, y: 0, width: store.fullCanvasSize, height: store.fullCanvasSize, listening: false }"
        />
      </v-layer>

    </v-stage>

    <canvas
      ref="cursorCanvasRef"
      class="cursor-canvas"
      :width="containerW || 500"
      :height="containerH || 500"
    />

    <ZoomNavigator
      :zoom="viewZoom"
      :min-zoom="0.1"
      :max-zoom="8"
      @update:zoom="onZoomSlider"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
    />
  </div>
</template>

<style lang="scss" scoped>
.editor-canvas {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: none;
  background-image:
    linear-gradient(45deg, #2b2b36 25%, transparent 25%),
    linear-gradient(-45deg, #2b2b36 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2b2b36 75%),
    linear-gradient(-45deg, transparent 75%, #2b2b36 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  background-color: #21212a;
}

.cursor-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; // не перехватывает события мыши
  z-index: 10;
}
</style>
