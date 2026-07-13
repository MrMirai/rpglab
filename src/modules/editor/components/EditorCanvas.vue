<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../store'
import { useAutoMask } from '../composables/useAutoMask'
import { useBrushMask } from '../composables/useBrushMask'
import { useAutoBackground } from '../composables/useAutoBackground'
import { useHistory } from '../composables/useHistory'
import { useEditorBridge } from '../composables/useEditorBridge'
import ZoomNavigator from '@/shared/components/ZoomNavigator.vue'
import HotkeyHelp from './HotkeyHelp.vue'

const store = useEditorStore()
const { generateMask } = useAutoMask()
const { brushCanvas, paint, fillPath, setRedraw, bumpBrushVersion } = useBrushMask()
const { generateBackground } = useAutoBackground()
const history = useHistory()
const bridge = useEditorBridge()

const containerRef = ref(null)
const stageRef = ref(null)
// Каждый Konva-слой — отдельный <canvas> в DOM (рекомендация Konva: ≤3-5 слоёв).
// Весь статичный контент (фон/тени/персонаж/рамка/сетка) живёт в одном sceneLayer —
// порядок отрисовки задаётся порядком узлов внутри слоя; оверлей отдельно.
const sceneLayer = ref(null)
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
const charShadowBottomCanvas = ref(null)
const charBottomCanvas = ref(null)
const charShadowTopCanvas = ref(null)
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

// Рисует персонажа только с цветовыми фильтрами (без тени) на переданном контексте.
function renderCharWithFilters(targetCtx, x, y, w, h) {
  const filter = buildCharFilter()
  targetCtx.save()
  if (filter !== 'none') targetCtx.filter = filter
  targetCtx.drawImage(store.charImage, x, y, w, h)
  targetCtx.restore()
}

// Строит canvas ТОЛЬКО с тенью (без самого силуэта) от переданной формы —
// тень персонажа целиком, до разрезания по маскам нижнего/верхнего слоя.
// Приём: рисуем силуэт с ctx.shadow* (даёт тень+силуэт), затем вырезаем сам
// силуэт через destination-out, оставляя только тень позади него.
function buildShadowLayer(fullSilhouette) {
  const out = document.createElement('canvas')
  out.width = fullSilhouette.width
  out.height = fullSilhouette.height
  const ctx = out.getContext('2d')

  const sc = store.charShadowColor
  const sr = parseInt(sc.slice(1, 3), 16)
  const sg = parseInt(sc.slice(3, 5), 16)
  const sb = parseInt(sc.slice(5, 7), 16)
  ctx.shadowColor = `rgba(${sr},${sg},${sb},${store.charShadowOpacity / 100})`
  ctx.shadowBlur = store.charShadowBlur
  ctx.shadowOffsetX = store.charShadowOffsetX
  ctx.shadowOffsetY = store.charShadowOffsetY
  ctx.drawImage(fullSilhouette, 0, 0)

  ctx.shadowColor = 'transparent'
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(fullSilhouette, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  return out
}

// Обрезает canvas маской (destination-in) и возвращает новый canvas того же размера.
function clipCanvas(source, maskCanvas, maskX = 0, maskY = 0, maskW = source.width, maskH = source.height) {
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = out.getContext('2d')
  ctx.drawImage(source, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskCanvas, maskX, maskY, maskW, maskH)
  ctx.globalCompositeOperation = 'source-over'
  return out
}

// Кеш между кадрами кисти: во время мазка меняется только brushCanvas,
// поэтому фон, нижний силуэт и маску тени можно не пересобирать на каждый
// mousemove (это была основная причина лагов кисти — аллокации и композиты
// холстов fullCanvasSize² на каждое событие мыши).
let cachedBottomSilhouette = null
let cachedShadowMask = null // маска1, развёрнутая в полные координаты (для обрезки тени)

// brushOnly=true — быстрый путь для мазка кисти/лассо: переиспользует кеш
// нижнего силуэта и фона, пересобирает только зависящее от brushCanvas.
function renderOffscreen(brushOnly = false) {
  const fullSize = store.fullCanvasSize
  const frameSize = store.canvasSize
  const offset = store.frameOffset

  if (!store.charImage) {
    // Персонажа нет (удалили, отменили действие и т.д.) — не оставляем
    // протухшие силуэт/тень с прошлого кадра.
    renderBg()
    charBottomCanvas.value = null
    charTopCanvas.value = null
    charShadowBottomCanvas.value = null
    charShadowTopCanvas.value = null
    cachedBottomSilhouette = null
    cachedShadowMask = null
    return
  }

  if (!brushOnly || !cachedBottomSilhouette) {
    const mask = store.maskImage || (store.frameImage ? generateMask(store.frameImage, frameSize) : null)
    renderBg()

    // --- Нижний силуэт: персонаж × маска1 (только в области рамки), в полных координатах ---
    const maskedChar = document.createElement('canvas')
    maskedChar.width = frameSize; maskedChar.height = frameSize
    const mc = maskedChar.getContext('2d')
    renderCharWithFilters(mc, charDrawX.value - offset, charDrawY.value - offset, charW.value, charH.value)
    if (mask) {
      mc.globalCompositeOperation = 'destination-in'
      mc.drawImage(mask, 0, 0, frameSize, frameSize)
      mc.globalCompositeOperation = 'source-over'
    }
    const bottomSilhouette = document.createElement('canvas')
    bottomSilhouette.width = fullSize; bottomSilhouette.height = fullSize
    bottomSilhouette.getContext('2d').drawImage(maskedChar, offset, offset)
    cachedBottomSilhouette = bottomSilhouette

    if (mask) {
      const shadowMaskFull = document.createElement('canvas')
      shadowMaskFull.width = fullSize; shadowMaskFull.height = fullSize
      shadowMaskFull.getContext('2d').drawImage(mask, offset, offset, frameSize, frameSize)
      cachedShadowMask = shadowMaskFull
    } else {
      cachedShadowMask = null
    }
  }

  // --- Верхний силуэт: персонаж × brushCanvas, в полных координатах ---
  const topSilhouette = document.createElement('canvas')
  topSilhouette.width = fullSize; topSilhouette.height = fullSize
  const ttx = topSilhouette.getContext('2d')
  renderCharWithFilters(ttx, charDrawX.value, charDrawY.value, charW.value, charH.value)
  ttx.globalCompositeOperation = 'destination-in'
  ttx.drawImage(brushCanvas, 0, 0)
  ttx.globalCompositeOperation = 'source-over'

  charBottomCanvas.value = cachedBottomSilhouette
  charTopCanvas.value = topSilhouette

  if (!store.charShadowEnabled) {
    charShadowBottomCanvas.value = null
    charShadowTopCanvas.value = null
    return
  }

  // Объединённый силуэт (нижний ∪ верхний) — тень строится от него ЦЕЛИКОМ,
  // чтобы на границе масок не было разрыва/задвоения. Затем тень (не сам
  // силуэт) разрезаем обратно по тем же маскам для раздельной отрисовки
  // под рамкой (нижняя часть) и над рамкой (верхняя, вылезающая часть).
  const combined = document.createElement('canvas')
  combined.width = fullSize; combined.height = fullSize
  const cctx = combined.getContext('2d')
  cctx.drawImage(cachedBottomSilhouette, 0, 0)
  cctx.drawImage(topSilhouette, 0, 0)

  const fullShadow = buildShadowLayer(combined)

  // Нижняя часть тени — видна только в окне рамки (маска1), рисуется под рамкой.
  charShadowBottomCanvas.value = cachedShadowMask ? clipCanvas(fullShadow, cachedShadowMask) : null

  // Верхняя часть тени — видна там же, где вылезающий персонаж (brushCanvas), рисуется над рамкой.
  charShadowTopCanvas.value = clipCanvas(fullShadow, brushCanvas)
}

function renderOverlay() {
  const fullSize = store.fullCanvasSize

  // Ни один режим отображения не активен — не аллоцируем холст fullSize² зря
  // (renderOverlay дёргается на каждый кадр кисти через redrawAll).
  if (!store.showMaskOverlay && !(store.showHidden && store.charImage)) {
    overlayCanvas.value = null
    nextTick(() => overlayLayer.value?.getNode()?.batchDraw())
    return
  }

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
  } else if (store.showHidden && store.charImage) {
    // Режим «Скрытое» — призрак частей персонажа, скрытых масками (для навигации).
    // Скрытое = полный силуэт персонажа МИНУС видимое (нижний ∪ верхний слои).

    // 1. Полный персонаж (с фильтрами, без тени) на весь холст.
    const full = document.createElement('canvas')
    full.width = fullSize; full.height = fullSize
    const fctx = full.getContext('2d')
    renderCharWithFilters(fctx, charDrawX.value, charDrawY.value, charW.value, charH.value)

    // 2. Вычитаем видимые области (то, что уже показано слоями).
    fctx.globalCompositeOperation = 'destination-out'
    if (charBottomCanvas.value) fctx.drawImage(charBottomCanvas.value, 0, 0)
    if (charTopCanvas.value) fctx.drawImage(charTopCanvas.value, 0, 0)
    fctx.globalCompositeOperation = 'source-over'

    // 3. Рисуем призрак полупрозрачно.
    octx.globalAlpha = 0.28
    octx.drawImage(full, 0, 0)
    octx.globalAlpha = 1

    // 4. Лёгкая синяя подкраска скрытых зон — чтобы отличать от обычного вида.
    octx.globalCompositeOperation = 'source-atop'
    octx.fillStyle = 'rgba(90, 150, 220, 0.35)'
    octx.fillRect(0, 0, fullSize, fullSize)
    octx.globalCompositeOperation = 'source-over'
  }

  overlayCanvas.value = oc
  nextTick(() => overlayLayer.value?.getNode()?.batchDraw())
}

function redrawAll(brushOnly = false) {
  renderOffscreen(brushOnly)
  renderOverlay()
  nextTick(() => {
    sceneLayer.value?.getNode()?.batchDraw()
    overlayLayer.value?.getNode()?.batchDraw()
  })
}

// Троттлинг перерисовки кисти: mousemove приходит чаще, чем кадры экрана,
// а renderOffscreen (даже brushOnly) — недешёвый. Мазки копятся в brushCanvas
// синхронно (paint), а пересборка слоёв — максимум раз за кадр.
let brushRedrawScheduled = false
function scheduleBrushRedraw() {
  if (brushRedrawScheduled) return
  brushRedrawScheduled = true
  requestAnimationFrame(() => {
    brushRedrawScheduled = false
    redrawAll(true)
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
  [() => store.showMaskOverlay, () => store.showHidden],
  () => renderOverlay(),
)

// При загрузке рамки — возвращаемся к виду рамки
watch(() => store.frameImage, (img) => {
  if (img) nextTick(() => centerViewOnFrame())
})

// Смена инструмента — запускаем/останавливаем визуализацию курсора кисти.
// Размер/жёсткость читаются из store прямо в анимационном loop, отдельный watch не нужен.
watch(() => store.activeTool, (tool) => {
  if (tool === 'brush') {
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

  // renderOffscreen сама корректно очищает слои персонажа/тени, если
  // store.charImage отсутствует — здесь просто прогоняем обычный путь.
  void img
  renderOffscreen()
  renderOverlay()

  nextTick(() => {
    sceneLayer.value?.getNode()?.batchDraw()
    overlayLayer.value?.getNode()?.batchDraw()
  })
})

const charShadowBottomConfig = computed(() => ({
  image: charShadowBottomCanvas.value,
  x: 0, y: 0,
  width: store.fullCanvasSize,
  height: store.fullCanvasSize,
  listening: false,
}))

const charShadowTopConfig = computed(() => ({
  image: charShadowTopCanvas.value,
  x: 0, y: 0,
  width: store.fullCanvasSize,
  height: store.fullCanvasSize,
  listening: false,
}))

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
  if (tool === 'brush') {
    containerRef.value.style.cursor = 'none'
    return
  }
  if (tool === 'hand') {
    containerRef.value.style.cursor = isPanning ? 'grabbing' : 'grab'
    return
  }
  containerRef.value.style.cursor = cursor
}

// --- Лассо (безье-контур) ---
// Узел пути: точка p + безье-ручки hIn/hOut (смещения относительно p, в координатах
// холста). Прямые сегменты — когда ручки нулевые. Всё состояние UI-путь держим локально,
// в стор идёт только activeTool='lasso' и режим add/subtract.
const lassoCanvasRef = ref(null)
let lassoNodes = []            // [{ p:{x,y}, hIn:{x,y}, hOut:{x,y} }]
let lassoClosed = false        // контур замкнут
let lassoHoverFirst = false    // курсор над первой точкой (подсказка замыкания)
let lassoMouse = { x: 0, y: 0 } // текущая позиция мыши в координатах холста (для «резинки»)
// Перетаскивание при построении/редактировании
let lassoDragging = null       // { kind:'handle'|'node', index, ... } либо null
let lassoDashOffset = 0
let lassoAnimFrame = null
// Ручное определение двойного клика (Konva dblclick коалесит клики и «съедает» узел,
// поэтому детектим сами по времени+позиции между mousedown).
let lassoLastDown = { t: 0, x: 0, y: 0 }
// Эффективный режим: true = subtract (скрыть).
function lassoEffectiveSubtract() {
  return store.lassoMode === 'subtract'
}

const NODE_HIT_R = 8           // радиус захвата узла (экранные px)
const HANDLE_HIT_R = 7
const DBLCLICK_MS = 350        // окно двойного клика
const DBLCLICK_DIST = 6        // макс. смещение между кликами пары (экранные px)

function lassoReset() {
  lassoNodes = []
  lassoClosed = false
  lassoHoverFirst = false
  lassoDragging = null
  lassoLastDown = { t: 0, x: 0, y: 0 }
  drawLasso()
}

// Строит Path2D контура в координатах холста (для заливки и для отрисовки).
function buildLassoPath() {
  if (lassoNodes.length < 2) return null
  const path = new Path2D()
  const n = lassoNodes
  path.moveTo(n[0].p.x, n[0].p.y)
  const segCount = lassoClosed ? n.length : n.length - 1
  for (let i = 0; i < segCount; i++) {
    const a = n[i]
    const b = n[(i + 1) % n.length]
    const c1x = a.p.x + a.hOut.x, c1y = a.p.y + a.hOut.y
    const c2x = b.p.x + b.hIn.x,  c2y = b.p.y + b.hIn.y
    path.bezierCurveTo(c1x, c1y, c2x, c2y, b.p.x, b.p.y)
  }
  if (lassoClosed) path.closePath()
  return path
}

// Переводит координату холста в экранную (с учётом pan/zoom вьюпорта).
function canvasToScreen(cx, cy) {
  return { x: cx * viewZoom.value + viewX.value, y: cy * viewZoom.value + viewY.value }
}

function drawLasso() {
  const canvas = lassoCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (store.activeTool !== 'lasso' || lassoNodes.length === 0) return

  // Цвет отражает эффективный режим с учётом Alt: янтарный — показать, красный — скрыть.
  const subtract = lassoEffectiveSubtract()
  const col = subtract ? 'rgba(192, 84, 74, 1)' : 'rgba(196, 149, 74, 1)'
  const fill = subtract ? 'rgba(192, 84, 74, 0.18)' : 'rgba(196, 149, 74, 0.18)'

  // Кривая пути в экранных координатах: строим Path2D заново от canvasToScreen
  const path = new Path2D()
  const n = lassoNodes
  const s0 = canvasToScreen(n[0].p.x, n[0].p.y)
  path.moveTo(s0.x, s0.y)
  const segCount = lassoClosed ? n.length : n.length - 1
  for (let i = 0; i < segCount; i++) {
    const a = n[i], b = n[(i + 1) % n.length]
    const c1 = canvasToScreen(a.p.x + a.hOut.x, a.p.y + a.hOut.y)
    const c2 = canvasToScreen(b.p.x + b.hIn.x, b.p.y + b.hIn.y)
    const e = canvasToScreen(b.p.x, b.p.y)
    path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, e.x, e.y)
  }

  // «Резинка» до курсора, пока контур не замкнут
  if (!lassoClosed && n.length >= 1) {
    const last = n[n.length - 1]
    const c1 = canvasToScreen(last.p.x + last.hOut.x, last.p.y + last.hOut.y)
    const m = canvasToScreen(lassoMouse.x, lassoMouse.y)
    ctx.beginPath()
    const ls = canvasToScreen(last.p.x, last.p.y)
    ctx.moveTo(ls.x, ls.y)
    ctx.quadraticCurveTo(c1.x, c1.y, m.x, m.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.stroke()
    ctx.setLineDash([])
  }

  if (lassoClosed) {
    ctx.fillStyle = fill
    ctx.fill(path)
  }

  // Сам контур — анимированный пунктир
  ctx.strokeStyle = col
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.lineDashOffset = -lassoDashOffset
  ctx.stroke(path)
  ctx.setLineDash([])

  // Ручки безье
  for (const node of n) {
    for (const h of [node.hIn, node.hOut]) {
      if (h.x === 0 && h.y === 0) continue
      const p = canvasToScreen(node.p.x, node.p.y)
      const hp = canvasToScreen(node.p.x + h.x, node.p.y + h.y)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y); ctx.lineTo(hp.x, hp.y)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
    }
  }

  // Узлы — квадраты; первый выделен (для замыкания)
  n.forEach((node, i) => {
    const p = canvasToScreen(node.p.x, node.p.y)
    const size = i === 0 ? 5 : 4
    ctx.beginPath()
    ctx.rect(p.x - size, p.y - size, size * 2, size * 2)
    ctx.fillStyle = (i === 0 && lassoHoverFirst && !lassoClosed) ? col : '#fff'
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = 1.5
    ctx.stroke()
  })
}

function startLassoAnim() {
  if (lassoAnimFrame) return
  function tick() {
    lassoDashOffset = (lassoDashOffset + 0.3) % 18
    drawLasso()
    lassoAnimFrame = requestAnimationFrame(tick)
  }
  lassoAnimFrame = requestAnimationFrame(tick)
}
function stopLassoAnim() {
  if (lassoAnimFrame) { cancelAnimationFrame(lassoAnimFrame); lassoAnimFrame = null }
  const canvas = lassoCanvasRef.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
}

// Применяет замкнутый контур к маске вылезания и сбрасывает путь.
// Режим (показать/скрыть) берём из lassoEffectiveSubtract() — с учётом Alt.
function applyLasso() {
  if (!lassoClosed || lassoNodes.length < 2) return
  const path = buildLassoPath()
  if (!path) return
  recordHistory()
  fillPath(path, lassoEffectiveSubtract())
  // Лассо меняет только brushCanvas — быстрый путь без пересборки фона/нижнего слоя
  redrawAll(true)
  lassoReset()
}

// hit-test: возвращает { kind, index } под экранной точкой (sx,sy) или null
function lassoHitTest(sx, sy) {
  for (let i = 0; i < lassoNodes.length; i++) {
    const node = lassoNodes[i]
    for (const key of ['hOut', 'hIn']) {
      const h = node[key]
      if (h.x === 0 && h.y === 0) continue
      const hp = canvasToScreen(node.p.x + h.x, node.p.y + h.y)
      if (Math.hypot(hp.x - sx, hp.y - sy) <= HANDLE_HIT_R)
        return { kind: 'handle', index: i, key }
    }
  }
  for (let i = 0; i < lassoNodes.length; i++) {
    const p = canvasToScreen(lassoNodes[i].p.x, lassoNodes[i].p.y)
    if (Math.hypot(p.x - sx, p.y - sy) <= NODE_HIT_R)
      return { kind: 'node', index: i }
  }
  return null
}

// canvasPos — координаты холста; screenPos — экранные (для hit-теста).
function onLassoMouseDown(canvasPos, screenPos) {
  lassoMouse = { ...canvasPos }

  // Уже замкнут — режим редактирования: тащим узел/ручку под курсором.
  if (lassoClosed) {
    const hit = lassoHitTest(screenPos.x, screenPos.y)
    if (hit) lassoDragging = hit
    return
  }

  // Ручной детект двойного клика: два mousedown подряд рядом по времени и месту.
  const now = performance.now()
  const isDbl =
    now - lassoLastDown.t <= DBLCLICK_MS &&
    Math.hypot(screenPos.x - lassoLastDown.x, screenPos.y - lassoLastDown.y) <= DBLCLICK_DIST
  lassoLastDown = { t: now, x: screenPos.x, y: screenPos.y }

  // Двойной клик — замкнуть контур (первый клик пары уже добавил узел, убираем его).
  if (isDbl && lassoNodes.length >= 3) {
    lassoNodes.pop()
    lassoClosed = true
    lassoDragging = null
    drawLasso()
    return
  }

  // Клик рядом с первой точкой (и есть ≥2 узлов) — замыкаем контур.
  if (lassoNodes.length >= 2) {
    const first = canvasToScreen(lassoNodes[0].p.x, lassoNodes[0].p.y)
    if (Math.hypot(first.x - screenPos.x, first.y - screenPos.y) <= NODE_HIT_R) {
      lassoClosed = true
      lassoDragging = null
      drawLasso()
      return
    }
  }

  // Иначе — добавляем новый узел; последующий drag тянет его безье-ручку.
  const node = { p: { ...canvasPos }, hIn: { x: 0, y: 0 }, hOut: { x: 0, y: 0 } }
  lassoNodes.push(node)
  lassoDragging = { kind: 'newHandle', index: lassoNodes.length - 1 }
  drawLasso()
}

function onLassoMouseMove(canvasPos, screenPos) {
  lassoMouse = { ...canvasPos }

  if (lassoDragging) {
    const node = lassoNodes[lassoDragging.index]
    if (lassoDragging.kind === 'newHandle') {
      // Тянем симметричные ручки от только что поставленного узла.
      node.hOut = { x: canvasPos.x - node.p.x, y: canvasPos.y - node.p.y }
      node.hIn = { x: -node.hOut.x, y: -node.hOut.y }
    } else if (lassoDragging.kind === 'handle') {
      const h = { x: canvasPos.x - node.p.x, y: canvasPos.y - node.p.y }
      node[lassoDragging.key] = h
      // Зеркалим противоположную ручку — гладкий узел.
      const other = lassoDragging.key === 'hOut' ? 'hIn' : 'hOut'
      node[other] = { x: -h.x, y: -h.y }
    } else if (lassoDragging.kind === 'node') {
      node.p = { ...canvasPos }
    }
    drawLasso()
    return
  }

  // Без перетаскивания: подсветка первой точки для замыкания + «резинка».
  if (!lassoClosed && lassoNodes.length >= 2) {
    const first = canvasToScreen(lassoNodes[0].p.x, lassoNodes[0].p.y)
    lassoHoverFirst = Math.hypot(first.x - screenPos.x, first.y - screenPos.y) <= NODE_HIT_R
  } else {
    lassoHoverFirst = false
  }
  setCursor(lassoHoverFirst ? 'pointer' : 'crosshair')
  drawLasso()
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
  if (store.activeTool !== 'brush') return

  // Радиус кисти в экранных координатах (с учётом zoom вьюпорта)
  const screenR = (store.brushSize / 2) * viewZoom.value
  const hard = store.brushHardness / 100
  const coreR = screenR * hard

  // Градиентное ядро — зона жёсткости
  if (coreR > 1) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, screenR)
    if (store.brushMode === 'restore') {
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
  ctx.strokeStyle = store.brushMode === 'restore'
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
    // Alt переключает режим инструмента
    if (e.code === 'AltLeft') {
      e.preventDefault()
      if (store.activeTool === 'brush') {
        store.setBrushMode(store.brushMode === 'restore' ? 'erase' : 'restore')
      } else if (store.activeTool === 'lasso') {
        store.setLassoMode(store.lassoMode === 'add' ? 'subtract' : 'add')
        drawLasso()
      }
    }
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
    // Лассо: Enter — применить, Esc — отменить/сбросить путь
    if (store.activeTool === 'lasso' && lassoNodes.length > 0) {
      if (e.code === 'Enter') {
        e.preventDefault()
        if (!lassoClosed && lassoNodes.length >= 3) lassoClosed = true
        applyLasso()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        lassoReset()
      }
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
    if (tool === 'brush') {
      startCursorAnim()
      containerRef.value.style.cursor = 'none'
    } else if (tool === 'lasso') {
      startLassoAnim()
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

    if (tool === 'lasso' && store.isReady) {
      onLassoMouseDown(canvasPos, pos)
      return
    }

    if (tool === 'move') {
      recordHistory()
      isDragging = true
      dragStart = canvasPos
      dragStartChar = { x: store.charX, y: store.charY }
      setCursor('grabbing')
    } else if ((tool === 'brush') && store.isReady) {
      recordHistory()
      isPainting = true
      // brushCanvas теперь занимает весь холст — координаты передаём как есть
      paint(canvasPos.x, canvasPos.y, store.brushSize, store.brushHardness, store.brushMode === 'erase')
      scheduleBrushRedraw()
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

    if (tool === 'lasso') {
      onLassoMouseMove(canvasPos, pos)
      return
    }

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
    } else if ((tool === 'brush') && isPainting) {
      paint(canvasPos.x, canvasPos.y, store.brushSize, store.brushHardness, store.brushMode === 'erase')
      scheduleBrushRedraw()
    }
  })

  stage.on('mouseup', () => {
    const tool = store.activeTool
    isPanning = false
    isPainting = false
    isDragging = false
    lassoDragging = null
    if (isSpaceDown) { setCursor('grab'); return }
    if (tool === 'hand') setCursor('grab')
    else if (tool === 'move') setCursor('grab')
    else setCursor('crosshair')
  })

  stage.on('mouseleave', () => {
    isPanning = false
    isPainting = false
    isDragging = false
    lassoDragging = null
    setCursor('default')
  })

  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const pos = stage.getPointerPosition()
    const tool = store.activeTool

    if (e.evt.ctrlKey || e.evt.metaKey) {
      if (tool === 'brush') {
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
    } else if (e.evt.shiftKey && (tool === 'brush')) {
      // Shift+колёсико в режиме кисти — меняем жёсткость кисти.
      // При зажатом Shift браузер может отдавать скролл в deltaX вместо deltaY.
      const delta = e.evt.deltaY || e.evt.deltaX
      const dir = delta > 0 ? -1 : 1
      store.brushHardness = Math.min(100, Math.max(0, store.brushHardness + dir * 5))
      drawBrushCursor(cursorX, cursorY)
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

// Смена инструмента: сбрасываем незавершённый контур лассо и запускаем/останавливаем
// анимацию пунктира. Незамкнутый путь при уходе с инструмента просто отбрасываем.
watch(() => store.activeTool, (tool) => {
  if (tool === 'lasso') {
    if (isCursorVisible) startLassoAnim()
  } else {
    lassoReset()
    stopLassoAnim()
  }
})

onUnmounted(() => {
  ro?.disconnect()
  stopCursorAnim()
  stopLassoAnim()
})
</script>

<template>
  <div class="editor-canvas" ref="containerRef">
    <v-stage :config="stageConfig" ref="stageRef">

      <!-- Единый слой сцены. Konva-слой = отдельный <canvas> в DOM (рекомендация ≤3-5),
           поэтому весь статичный контент в одном слое — порядок узлов задаёт z-order:
           фон → тень-низ → персонаж-низ → рамка → сетка → тень-верх → персонаж-верх -->
      <v-layer ref="sceneLayer">
        <v-image
          v-if="bgCanvas"
          :config="{ image: bgCanvas, x: 0, y: 0, width: store.fullCanvasSize, height: store.fullCanvasSize, listening: false }"
        />
        <v-image
          v-if="charShadowBottomCanvas"
          :config="charShadowBottomConfig"
        />
        <v-image
          v-if="store.hasChar"
          :config="charBottomConfig"
        />
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
        <v-image
          v-if="charShadowTopCanvas"
          :config="charShadowTopConfig"
        />
        <v-image
          v-if="store.hasChar"
          :config="charTopConfig"
        />
      </v-layer>

      <!-- Оверлей режимов отображения (Маска/Скрытое) — отдельный слой,
           чтобы не перерисовывать сцену при переключении режимов -->
      <v-layer ref="overlayLayer">
        <v-image
          v-if="overlayCanvas && (store.showMaskOverlay || store.showHidden)"
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

    <!-- Оверлей лассо (безье-контур) поверх Konva -->
    <canvas
      ref="lassoCanvasRef"
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
      @reset="centerViewOnFrame"
    />

    <HotkeyHelp :tool="store.activeTool" />
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
