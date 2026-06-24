<script setup>
import { ref, computed, watchEffect, nextTick, onMounted, onUnmounted } from 'vue'
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

const containerW = ref(0)
const containerH = ref(0)

const stageScale = computed(() => {
  if (!containerW.value || !containerH.value) return 1
  const padding = 40
  const scaleX = (containerW.value - padding * 2) / store.canvasSize
  const scaleY = (containerH.value - padding * 2) / store.canvasSize
  return Math.min(scaleX, scaleY)
})

const stageX = computed(() => (containerW.value - store.canvasSize * stageScale.value) / 2)
const stageY = computed(() => (containerH.value - store.canvasSize * stageScale.value) / 2)

const stageConfig = computed(() => ({
  width: containerW.value || store.canvasSize,
  height: containerH.value || store.canvasSize,
  scaleX: stageScale.value,
  scaleY: stageScale.value,
  x: stageX.value,
  y: stageY.value,
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

function redrawAll() {
  renderOffscreen()
  nextTick(() => {
    charBottomLayer.value?.getNode()?.batchDraw()
    charTopLayer.value?.getNode()?.batchDraw()
  })
}

setRedraw(() => redrawAll())

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
    x: (pos.x - stageX.value) / stageScale.value,
    y: (pos.y - stageY.value) / stageScale.value,
  }
}

let isPainting = false
let isDragging = false
let dragStart = { x: 0, y: 0 }
let dragStartChar = { x: 0, y: 0 }

let ro = null

onMounted(() => {
  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    containerW.value = width
    containerH.value = height
  })
  ro.observe(containerRef.value)
  containerW.value = containerRef.value.offsetWidth
  containerH.value = containerRef.value.offsetHeight

  const stage = stageRef.value?.getStage()
  if (!stage) return

  stage.on('mousedown', () => {
    const tool = store.activeTool
    const pos = getCanvasPos(stage)
    if (tool === 'move') {
      isDragging = true
      dragStart = pos
      dragStartChar = { x: store.charX, y: store.charY }
      setCursor('grabbing')
    } else if ((tool === 'erase' || tool === 'restore') && store.isReady) {
      isPainting = true
      paint(pos.x, pos.y, store.brushSize, store.brushHardness, tool === 'erase')
      redrawAll()
    }
  })

  stage.on('mousemove', () => {
    const tool = store.activeTool
    const pos = getCanvasPos(stage)
    if (tool === 'move') {
      if (!isDragging) { setCursor('grab'); return }
      store.setCharPosition(
        Math.round(dragStartChar.x + (pos.x - dragStart.x)),
        Math.round(dragStartChar.y + (pos.y - dragStart.y)),
      )
    } else if ((tool === 'erase' || tool === 'restore') && isPainting) {
      paint(pos.x, pos.y, store.brushSize, store.brushHardness, tool === 'erase')
      redrawAll()
    }
  })

  stage.on('mouseup', () => { isPainting = false; isDragging = false; setCursor('default') })
  stage.on('mouseleave', () => { isPainting = false; isDragging = false; setCursor('default') })

  stage.on('wheel', (e) => {
    if (store.activeTool !== 'move') return
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? -0.05 : 0.05
    const newScale = Math.min(3, Math.max(0.1, store.charScale + delta))
    store.setCharScale(Math.round(newScale * 100) / 100)
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

      <!-- Слой 2: рамка -->
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
