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
const { brushCanvas, paint, setRedraw } = useBrushMask()
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

function centerView() {
  const padding = 40
  const scaleX = (containerW.value - padding * 2) / store.canvasSize
  const scaleY = (containerH.value - padding * 2) / store.canvasSize
  viewZoom.value = Math.min(scaleX, scaleY)
  viewX.value = (containerW.value - store.canvasSize * viewZoom.value) / 2
  viewY.value = (containerH.value - store.canvasSize * viewZoom.value) / 2
}

const stageConfig = computed(() => ({
  width: containerW.value || store.canvasSize,
  height: containerH.value || store.canvasSize,
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
const charDrawX = computed(() => store.canvasSize / 2 + store.charX - charW.value / 2)
const charDrawY = computed(() => store.canvasSize / 2 + store.charY - charH.value / 2)

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
  const size = store.canvasSize
  if (store.bgType === 'none') { bgCanvas.value = null; return }

  const bgC = document.createElement('canvas')
  bgC.width = size; bgC.height = size
  const btx = bgC.getContext('2d')

  if (store.bgType === 'color') {
    btx.fillStyle = store.bgColor
    btx.fillRect(0, 0, size, size)
  } else if (store.bgType === 'image' && store.bgImage) {
    const img = store.bgImage
    const scale = Math.max(size / img.width, size / img.height)
    const sw = img.width * scale
    const sh = img.height * scale
    const sx = (size - sw) / 2
    const sy = (size - sh) / 2
    btx.drawImage(img, sx, sy, sw, sh)
  } else if (store.bgType === 'auto') {
    btx.drawImage(getAutoBg(size), 0, 0)
  }

  // Обрезаем маской формы рамки
  const mask = store.maskImage || (store.frameImage ? generateMask(store.frameImage, size) : null)
  if (mask) {
    btx.globalCompositeOperation = 'destination-in'
    btx.drawImage(mask, 0, 0, size, size)
    btx.globalCompositeOperation = 'source-over'
  }

  bgCanvas.value = bgC
}

function renderOffscreen() {
  renderBg()

  const size = store.canvasSize
  const img = store.charImage

  // Нижний слой: персонаж обрезанный по маске формы рамки
  const bottomC = document.createElement('canvas')
  bottomC.width = size; bottomC.height = size
  const btx = bottomC.getContext('2d')
  btx.drawImage(img, charDrawX.value, charDrawY.value, charW.value, charH.value)

  const mask = store.maskImage || (store.frameImage ? generateMask(store.frameImage, size) : null)
  if (mask) {
    btx.globalCompositeOperation = 'destination-in'
    btx.drawImage(mask, 0, 0, size, size)
    btx.globalCompositeOperation = 'source-over'
  }

  charBottomCanvas.value = bottomC

  // Верхний слой: персонаж обрезанный по кисти маски вылезания
  const topC = document.createElement('canvas')
  topC.width = size; topC.height = size
  const ttx = topC.getContext('2d')
  ttx.drawImage(img, charDrawX.value, charDrawY.value, charW.value, charH.value)
  ttx.globalCompositeOperation = 'destination-in'
  ttx.drawImage(brushCanvas, 0, 0)
  ttx.globalCompositeOperation = 'source-over'

  charTopCanvas.value = topC
}

function renderOverlay() {
  const size = store.canvasSize
  const oc = document.createElement('canvas')
  oc.width = size; oc.height = size
  const octx = oc.getContext('2d')

  if (store.showMaskOverlay) {
    // Инвертированный оверлей: янтарный там где маска прозрачная (скрытая область)
    octx.fillStyle = 'rgba(196, 149, 74, 0.45)'
    octx.fillRect(0, 0, size, size)
    octx.globalCompositeOperation = 'destination-out'
    octx.drawImage(brushCanvas, 0, 0)
    octx.globalCompositeOperation = 'source-over'
  } else if (store.showFrontOnly) {
    // Шахматный фон
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        octx.fillStyle = ((x + y) / 16) % 2 === 0 ? '#2b2b36' : '#21212a'
        octx.fillRect(x, y, 16, 16)
      }
    }
    // Затемняем всё кроме верхнего слоя
    octx.fillStyle = 'rgba(0,0,0,0.75)'
    octx.fillRect(0, 0, size, size)
    // Рисуем только верхний слой (что вылезает над рамкой)
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
  const size = store.canvasSize
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

  const size = store.canvasSize
  const bctx = brushCanvas.getContext('2d')
  bctx.clearRect(0, 0, size, size)
  bctx.drawImage(snapshot.brushSnapshot, 0, 0)
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
  centerView: () => centerView(),
  recordHistory,
  performUndo,
  performRedo,
})

watch(
  [() => store.showMaskOverlay, () => store.showFrontOnly],
  () => renderOverlay(),
)

// Смена инструмента — запускаем/останавливаем визуализацию курсора кисти.
// Размер/жёсткость читаются из store прямо в анимационном loop, отдельный watch не нужен.
watch(() => store.activeTool, (tool) => {
  if (tool === 'erase' || tool === 'restore') {
    if (isCursorVisible) {
      startCursorAnim()
      if (containerRef.value) containerRef.value.style.cursor = 'none'
    }
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
  width: store.canvasSize,
  height: store.canvasSize,
  listening: false,
}))

const charTopConfig = computed(() => ({
  image: charTopCanvas.value,
  x: 0, y: 0,
  width: store.canvasSize,
  height: store.canvasSize,
  listening: false,
}))

const frameConfig = computed(() => ({
  image: store.frameImage,
  x: 0, y: 0,
  width: store.canvasSize,
  height: store.canvasSize,
}))

const gridLines = computed(() => {
  const count = Math.floor(store.canvasSize / 50)
  return Array.from({ length: count - 1 }, (_, i) => i + 1)
})

function setCursor(cursor) {
  if (!containerRef.value) return
  const tool = store.activeTool
  // В режиме кисти системный курсор скрыт — рисуем свой
  if (tool === 'erase' || tool === 'restore') {
    containerRef.value.style.cursor = 'none'
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
    centerView()
  })
  ro.observe(containerRef.value)
  containerW.value = containerRef.value.offsetWidth
  containerH.value = containerRef.value.offsetHeight
  centerView()

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
    const screenPos = stage.getPointerPosition()

    if (isSpaceDown) {
      isPanning = true
      panStart = { x: screenPos.x, y: screenPos.y }
      panStartView = { x: viewX.value, y: viewY.value }
      setCursor('grabbing')
      return
    }

    const canvasPos = getCanvasPos(stage)

    if (tool === 'move') {
      recordHistory() // снимок один раз при начале drag
      isDragging = true
      dragStart = canvasPos
      dragStartChar = { x: store.charX, y: store.charY }
      setCursor('grabbing')
    } else if ((tool === 'erase' || tool === 'restore') && store.isReady) {
      recordHistory() // снимок один раз при начале рисования
      isPainting = true
      paint(canvasPos.x, canvasPos.y, store.brushSize, store.brushHardness, tool === 'erase')
      redrawAll()
    }
  })

  stage.on('mousemove', () => {
    const tool = store.activeTool
    const screenPos = stage.getPointerPosition()

    if (isPanning) {
      viewX.value = panStartView.x + (screenPos.x - panStart.x)
      viewY.value = panStartView.y + (screenPos.y - panStart.y)
      return
    }

    const canvasPos = getCanvasPos(stage)

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
    isPanning = false
    isPainting = false
    isDragging = false
    if (isSpaceDown) setCursor('grab')
    else setCursor(store.activeTool === 'move' ? 'grab' : 'crosshair')
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

    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Ctrl+колёсико — меняем размер кисти (шаг пропорционален размеру)
      const dir = e.evt.deltaY > 0 ? -1 : 1
      const step = Math.max(1, Math.round(store.brushSize * 0.08))
      store.brushSize = Math.min(200, Math.max(5, store.brushSize + dir * step))
      drawBrushCursor(cursorX, cursorY)
    } else if (isSpaceDown) {
      // Zoom вьюпорта — зумируем относительно позиции курсора (пробел+колёсико)
      const zoomFactor = e.evt.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(8, Math.max(0.1, viewZoom.value * zoomFactor))
      viewX.value = pos.x - (pos.x - viewX.value) * (newZoom / viewZoom.value)
      viewY.value = pos.y - (pos.y - viewY.value) * (newZoom / viewZoom.value)
      viewZoom.value = newZoom
    } else if (store.activeTool === 'move') {
      // Zoom персонажа (только в инструменте move)
      const delta = e.evt.deltaY > 0 ? -0.05 : 0.05
      const newScale = Math.min(3, Math.max(0.1, store.charScale + delta))
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
          :config="{ image: bgCanvas, x: 0, y: 0, width: store.canvasSize, height: store.canvasSize, listening: false }"
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
          <v-line
            v-for="i in gridLines"
            :key="'h' + i"
            :config="{ points: [0, i*50, store.canvasSize, i*50], stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }"
          />
          <v-line
            v-for="i in gridLines"
            :key="'v' + i"
            :config="{ points: [i*50, 0, i*50, store.canvasSize], stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }"
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
          :config="{ image: overlayCanvas, x: 0, y: 0, width: store.canvasSize, height: store.canvasSize, listening: false }"
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
