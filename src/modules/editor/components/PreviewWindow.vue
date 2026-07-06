<template>
  <Teleport to="body">
    <div v-if="store.previewMode" class="preview-window">
      <div class="preview-window__header">
        <span class="preview-window__title">Превью</span>
        <div class="preview-window__maps">
          <BaseButton
            v-for="map in mapStyles"
            :key="map.id"
            variant="ghost"
            size="sm"
            :active="activeMap === map.id"
            @click="activeMap = map.id; invalidateMapCache(); renderPreview()"
          >{{ map.label }}</BaseButton>
        </div>
        <BaseButton variant="ghost" size="sm" square danger-hover @click="store.togglePreview()">
          <X :size="14" />
        </BaseButton>
      </div>
      <div class="preview-window__canvas-wrap">
        <canvas ref="previewCanvasRef" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useAutoMask } from '../composables/useAutoMask'
import { useBrushMask } from '../composables/useBrushMask'
import BaseButton from '@/shared/components/BaseButton.vue'
import forestUrl from '@/shared/assets/maps/ForestBack.webp'
import tileUrl from '@/shared/assets/maps/TIleBack.webp'

const store = useEditorStore()
const { generateMask } = useAutoMask()
const { brushCanvas } = useBrushMask()

const previewCanvasRef = ref(null)

// Внутренний холст рендера — полная сетка 3×3
const RENDER_SIZE = 1500
const CELL_SIZE = RENDER_SIZE / 3     // 500px на клетку
// Отступ вокруг центральной клетки в пикселях рендер-холста
const CROP_MARGIN = 50
const CROP_AREA = CELL_SIZE + CROP_MARGIN * 2  // 600px вырезаем из рендер-холста

// Предзагрузка фоновых изображений
const bgImages = {}
  ;[
    { key: 'forest', url: forestUrl },
    { key: 'tile', url: tileUrl },
  ].forEach(({ key, url }) => {
    const img = new Image()
    img.onload = () => { bgImages[key] = img; invalidateMapCache(); renderPreview() }
    img.src = url
  })

const mapStyles = [
  { id: 'fantasy', label: 'Поле' },
  { id: 'dungeon', label: 'Подземелье' },
  { id: 'neutral', label: 'Нейтральная' },
]
const activeMap = ref('fantasy')

// --- Рисование карты ---

function drawMap(ctx, size, style) {
  const cell = size / 3

  if (style === 'fantasy') {
    if (bgImages.forest) {
      const img = bgImages.forest
      const scale = Math.max(size / img.width, size / img.height)
      ctx.drawImage(img,
        (size - img.width * scale) / 2,
        (size - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      )
    } else {
      ctx.fillStyle = '#2d4a1e'
      ctx.fillRect(0, 0, size, size)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    for (let x = 0; x <= size; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
    }

  } else if (style === 'dungeon') {
    if (bgImages.tile) {
      const img = bgImages.tile
      const scale = Math.max(size / img.width, size / img.height)
      ctx.drawImage(img,
        (size - img.width * scale) / 2,
        (size - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      )
    } else {
      ctx.fillStyle = '#2a2520'
      ctx.fillRect(0, 0, size, size)
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.lineWidth = 2
    for (let x = 0; x <= size; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= size; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
    }

  } else if (style === 'neutral') {
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= size; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    for (let x = 0; x <= size; x += cell) {
      for (let y = 0; y <= size; y += cell) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
}

function drawCharWithFilters(tc, charImg, x, y, w, h) {
  tc.save()
  const filters = []
  if (store.charHue !== 0) filters.push(`hue-rotate(${store.charHue}deg)`)
  if (store.charSaturation !== 100) filters.push(`saturate(${store.charSaturation}%)`)
  if (store.charBrightness !== 100) filters.push(`brightness(${store.charBrightness}%)`)
  if (store.charContrast !== 100) filters.push(`contrast(${store.charContrast}%)`)
  if (filters.length) tc.filter = filters.join(' ')
  tc.drawImage(charImg, x, y, w, h)
  tc.restore()
}

function drawToken(ctx, size) {
  if (!store.isReady) return

  const cell = size / 3
  // Центральная клетка [1,1]
  const tokenX = cell
  const tokenY = cell
  const tokenSize = cell
  const ratio = tokenSize / store.canvasSize

  const charImg = store.charImage
  const charW = charImg.width * store.charScale * ratio
  const charH = charImg.height * store.charScale * ratio
  const charX = tokenX + tokenSize / 2 + store.charX * ratio - charW / 2
  const charY = tokenY + tokenSize / 2 + store.charY * ratio - charH / 2

  const mask = generateMask(store.frameImage, tokenSize)

  function drawMasked(drawFn, maskCanvas, offX, offY) {
    const tmp = document.createElement('canvas')
    tmp.width = tokenSize; tmp.height = tokenSize
    const tc = tmp.getContext('2d')
    drawFn(tc)
    tc.globalCompositeOperation = 'destination-in'
    tc.drawImage(maskCanvas, 0, 0, tokenSize, tokenSize)
    ctx.drawImage(tmp, offX, offY)
  }

  if (store.bgType === 'color') {
    drawMasked((tc) => { tc.fillStyle = store.bgColor; tc.fillRect(0, 0, tokenSize, tokenSize) }, mask, tokenX, tokenY)
  } else if (store.bgType === 'image' && store.bgImage) {
    drawMasked((tc) => {
      const img = store.bgImage
      const s = Math.max(tokenSize / img.width, tokenSize / img.height)
      tc.drawImage(img, (tokenSize - img.width * s) / 2, (tokenSize - img.height * s) / 2, img.width * s, img.height * s)
    }, mask, tokenX, tokenY)
  }

  drawMasked((tc) => {
    drawCharWithFilters(tc, charImg, charX - tokenX, charY - tokenY, charW, charH)
  }, mask, tokenX, tokenY)

  ctx.drawImage(store.frameImage, tokenX, tokenY, tokenSize, tokenSize)

  // brushCanvas — весь unbounded-холст; вырезаем только клетку рамки (frameOffset..+canvasSize)
  const scaledBrush = document.createElement('canvas')
  scaledBrush.width = tokenSize; scaledBrush.height = tokenSize
  scaledBrush.getContext('2d').drawImage(
    brushCanvas,
    store.frameOffset, store.frameOffset, store.canvasSize, store.canvasSize,
    0, 0, tokenSize, tokenSize,
  )
  drawMasked((tc) => {
    drawCharWithFilters(tc, charImg, charX - tokenX, charY - tokenY, charW, charH)
  }, scaledBrush, tokenX, tokenY)
}

let mapCache = {}
function invalidateMapCache() { mapCache = {} }

async function renderPreview() {
  await nextTick()
  const canvas = previewCanvasRef.value
  if (!canvas) return

  // Размер canvas по физическим пикселям экрана — чёткость на Retina
  const dpr = window.devicePixelRatio || 1
  const displayPx = Math.round(320 * dpr)
  canvas.width = displayPx
  canvas.height = displayPx

  // Рендерим полную сетку 3×3 во внутренний холст
  const offscreen = document.createElement('canvas')
  offscreen.width = RENDER_SIZE; offscreen.height = RENDER_SIZE
  const octx = offscreen.getContext('2d')

  const mapId = activeMap.value
  if (!mapCache[mapId]) {
    const mapCanvas = document.createElement('canvas')
    mapCanvas.width = RENDER_SIZE; mapCanvas.height = RENDER_SIZE
    drawMap(mapCanvas.getContext('2d'), RENDER_SIZE, mapId)
    mapCache[mapId] = mapCanvas
  }
  octx.drawImage(mapCache[mapId], 0, 0)
  drawToken(octx, RENDER_SIZE)

  // Вырезаем область вокруг центральной клетки [1,1] и масштабируем в canvas
  const cropX = CELL_SIZE - CROP_MARGIN
  const cropY = CELL_SIZE - CROP_MARGIN
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, displayPx, displayPx)
  ctx.drawImage(offscreen, cropX, cropY, CROP_AREA, CROP_AREA, 0, 0, displayPx, displayPx)
}

watch(
  [
    () => store.previewMode,
    () => store.charX, () => store.charY, () => store.charScale,
    () => store.charHue, () => store.charSaturation,
    () => store.charBrightness, () => store.charContrast,
    () => store.bgType, () => store.bgColor,
    () => store.charImage, () => store.frameImage,
  ],
  () => { if (store.previewMode) renderPreview() },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.preview-window {
  position: fixed;
  top: 56px;
  left: 248px;
  z-index: 500;
  width: 320px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-3);
    border-bottom: 1px solid var(--color-border);
    user-select: none;
  }

  &__title {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    font-weight: var(--weight-medium);
    flex-shrink: 0;
  }

  &__maps {
    display: flex;
    gap: 2px;
    flex: 1;
  }

  &__canvas-wrap {
    background: #111;

    canvas {
      display: block;
      width: 100%;
      height: auto;
    }
  }
}
</style>
