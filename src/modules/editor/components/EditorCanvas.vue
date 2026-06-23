<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useEditorStore } from '../store'
import { useAutoMask } from '../composables/useAutoMask'

const store = useEditorStore()
const { generateMask } = useAutoMask()

const containerRef = ref(null)
const stageRef = ref(null)
const charBottomLayer = ref(null)
const charTopLayer = ref(null)

const stageConfig = computed(() => ({
  width: store.canvasSize,
  height: store.canvasSize,
}))

const charW = computed(() =>
  store.charImage ? store.charImage.width * store.charScale : 0
)
const charH = computed(() =>
  store.charImage ? store.charImage.height * store.charScale : 0
)
const charDrawX = computed(() => store.canvasSize / 2 + store.charX - charW.value / 2)
const charDrawY = computed(() => store.canvasSize / 2 + store.charY - charH.value / 2)

// Линия вылезания в px
const splitY = computed(() => store.canvasSize * store.overflowY / 100)

const charBottomCanvas = ref(null)
const charTopCanvas = ref(null)

watch(
  [
    () => store.charImage, () => store.charX, () => store.charY,
    () => store.charScale, () => store.overflowY, () => store.overflowSoft,
    () => store.maskImage, () => store.frameImage,
  ],
  () => { if (store.isReady) renderOffscreen() },
  { immediate: true },
)

function renderOffscreen() {
  const size = store.canvasSize
  const img = store.charImage

  // --- Нижний слой: персонаж, обрезанный маской рамки ---
  const bottomC = document.createElement('canvas')
  bottomC.width = size; bottomC.height = size
  const btx = bottomC.getContext('2d')
  btx.drawImage(img, charDrawX.value, charDrawY.value, charW.value, charH.value)

  const mask = store.maskImage || (store.frameImage ? generateMask(store.frameImage, size) : null)
  if (mask) {
    btx.globalCompositeOperation = 'destination-in'
    if (mask instanceof HTMLCanvasElement) btx.drawImage(mask, 0, 0)
    else btx.drawImage(mask, 0, 0, size, size)
    btx.globalCompositeOperation = 'source-over'
  }

  charBottomCanvas.value = bottomC

  // --- Верхний слой: персонаж, видимый только выше линии splitY ---
  const topC = document.createElement('canvas')
  topC.width = size; topC.height = size
  const ttx = topC.getContext('2d')
  ttx.drawImage(img, charDrawX.value, charDrawY.value, charW.value, charH.value)

  // Прозрачим всё ниже splitY с мягким переходом
  const soft = store.overflowSoft
  const grad = ttx.createLinearGradient(0, splitY.value - soft, 0, splitY.value + soft)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ttx.globalCompositeOperation = 'destination-in'
  ttx.fillStyle = grad
  ttx.fillRect(0, 0, size, size)
  ttx.globalCompositeOperation = 'source-over'

  charTopCanvas.value = topC
}

const charBottomConfig = computed(() => ({
  image: charBottomCanvas.value,
  x: 0, y: 0,
  width: store.canvasSize,
  height: store.canvasSize,
}))

const charTopConfig = computed(() => ({
  image: charTopCanvas.value,
  x: 0, y: 0,
  width: store.canvasSize,
  height: store.canvasSize,
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

// Перетаскивание и масштаб в режиме move
let isDragging = false
let dragStart = { x: 0, y: 0 }
let dragStartChar = { x: 0, y: 0 }

function setCursor(cursor) {
  if (containerRef.value) containerRef.value.style.cursor = cursor
}

onMounted(() => {
  const stage = stageRef.value?.getStage()
  if (!stage) return

  stage.on('mousedown', () => {
    if (store.activeTool !== 'move') return
    isDragging = true
    dragStart = stage.getPointerPosition()
    dragStartChar = { x: store.charX, y: store.charY }
    setCursor('grabbing')
  })

  stage.on('mousemove', () => {
    if (store.activeTool === 'move' && !isDragging) setCursor('grab')
    if (!isDragging || store.activeTool !== 'move') return
    const pos = stage.getPointerPosition()
    store.setCharPosition(
      Math.round(dragStartChar.x + (pos.x - dragStart.x)),
      Math.round(dragStartChar.y + (pos.y - dragStart.y)),
    )
  })

  stage.on('mouseup', () => {
    isDragging = false
    if (store.activeTool === 'move') setCursor('grab')
  })

  stage.on('mouseleave', () => {
    isDragging = false
    setCursor('default')
  })

  stage.on('wheel', (e) => {
    if (store.activeTool !== 'move') return
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? -0.05 : 0.05
    const newScale = Math.min(3, Math.max(0.1, store.charScale + delta))
    store.setCharScale(Math.round(newScale * 100) / 100)
  })
})
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
