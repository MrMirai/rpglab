<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../store'
import { useAutoMask } from '../composables/useAutoMask'
import { useBrushMask } from '../composables/useBrushMask'

const store = useEditorStore()
const { generateMask } = useAutoMask()
const { brushCanvas, paint, setRedraw } = useBrushMask()

const containerRef = ref(null)
const stageRef = ref(null)
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

const charBottomCanvas = ref(null)
const charTopCanvas = ref(null)
const overlayCanvas = ref(null)

function renderOffscreen() {
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
    // brushCanvas подкрашенный пурпурным
    octx.drawImage(brushCanvas, 0, 0)
    octx.globalCompositeOperation = 'source-in'
    octx.fillStyle = 'rgba(200, 80, 200, 0.6)'
    octx.fillRect(0, 0, size, size)
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
    charBottomLayer.value?.getNode()?.batchDraw()
    charTopLayer.value?.getNode()?.batchDraw()
  })
}

setRedraw(() => redrawAll())

watch(
  [() => store.showMaskOverlay, () => store.showFrontOnly],
  () => renderOverlay(),
)

watchEffect(() => {
  const img = store.charImage
  const frameImg = store.frameImage
  const x = store.charX
  const y = store.charY
  const scale = store.charScale
  const maskImg = store.maskImage
  const mv = store.maskVersion

  if (!img) return
  renderOffscreen()
  renderOverlay()

  nextTick(() => {
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
  if (containerRef.value) containerRef.value.style.cursor = cursor
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
    }
  })
  containerRef.value.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpaceDown = false
      isPanning = false
      setCursor(store.activeTool === 'move' ? 'grab' : 'crosshair')
    }
  })
  containerRef.value.addEventListener('mouseenter', () => {
    containerRef.value.focus({ preventScroll: true })
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
      isDragging = true
      dragStart = canvasPos
      dragStartChar = { x: store.charX, y: store.charY }
      setCursor('grabbing')
    } else if ((tool === 'erase' || tool === 'restore') && store.isReady) {
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

    if (e.evt.ctrlKey || isSpaceDown) {
      // Zoom вьюпорта — зумируем относительно позиции курсора
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

onUnmounted(() => ro?.disconnect())
</script>

<template>
  <div class="editor-canvas" ref="containerRef">
    <v-stage :config="stageConfig" ref="stageRef">

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
  </div>
</template>

<style lang="scss" scoped>
.editor-canvas {
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
</style>
