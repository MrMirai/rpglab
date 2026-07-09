<script setup>
import { ref, computed, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import { useHandoutSelection } from '../composables/useHandoutSelection'
import { useHandoutBridge } from '../composables/useHandoutBridge'
import { blendModeToOp } from '../store'
import ZoomNavigator from '@/shared/components/ZoomNavigator.vue'
import HandoutHotkeyHelp from './HandoutHotkeyHelp.vue'

const store = useHandoutStore()
const history = useHandoutHistory()
const { getTransformerNodes, handleStageClick, resolveElementId } = useHandoutSelection()
const bridge = useHandoutBridge()

const containerRef = ref(null)
const stageRef = ref(null)
const elementsLayerRef = ref(null)
const uiLayerRef = ref(null)
const transformerRef = ref(null)
const textareaRef = ref(null)

const containerW = ref(0)
const containerH = ref(0)

// Вьюпорт (pan/zoom сцены)
const viewX = ref(0)
const viewY = ref(0)
const viewZoom = ref(1)

// Вписать документ в контейнер с отступом
function centerView() {
  if (!containerW.value || !containerH.value) return
  const padding = 48
  const scale = Math.min(
    (containerW.value - padding * 2) / store.document.width,
    (containerH.value - padding * 2) / store.document.height,
  )
  viewZoom.value = Math.min(2, Math.max(0.05, scale))
  viewX.value = (containerW.value - store.document.width * viewZoom.value) / 2
  viewY.value = (containerH.value - store.document.height * viewZoom.value) / 2
}

// Синхронизируем вьюпорт в стор — addElement центрирует новые элементы по нему
watch([viewX, viewY, viewZoom, containerW, containerH], () => {
  store.setViewport({
    x: viewX.value, y: viewY.value, zoom: viewZoom.value,
    w: containerW.value, h: containerH.value,
  })
}, { immediate: true })

// Смена размера документа — перецентрируем вид
watch(() => [store.document.width, store.document.height], () => nextTick(centerView))

const stageConfig = computed(() => ({
  width: containerW.value || 800,
  height: containerH.value || 600,
  scaleX: viewZoom.value,
  scaleY: viewZoom.value,
  x: viewX.value,
  y: viewY.value,
}))

// --- Кэш картинок (элементы IMAGE + текстура фона) ---
// reactive-объект: когда картинка догружается, конфиги пересчитываются сами.
const imageCache = reactive({})

function imageFor(url) {
  if (!url) return null
  if (url in imageCache) return imageCache[url]
  imageCache[url] = null
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { imageCache[url] = img }
  img.src = url
  return null
}

// --- Фон документа ---
const docBorderConfig = computed(() => ({
  x: 0, y: 0,
  width: store.document.width,
  height: store.document.height,
  stroke: 'rgba(255,255,255,0.25)',
  strokeWidth: 1 / viewZoom.value,
  listening: false,
}))

const bgRectConfig = computed(() => ({
  x: 0, y: 0,
  width: store.document.width,
  height: store.document.height,
  fill: store.document.background.type === 'color'
    ? store.document.background.color
    : '#ffffff',
}))

const bgTextureConfig = computed(() => {
  const bg = store.document.background
  if (bg.type !== 'texture' || !bg.textureUrl) return null
  const img = imageFor(bg.textureUrl)
  if (!img) return null
  return {
    x: 0, y: 0,
    width: store.document.width,
    height: store.document.height,
    image: img,
  }
})

// --- Конфиги элементов ---
const draggableFor = (el) => !el.locked && store.activeTool === 'select'

// Отражение + режим наложения — общие для прямоугольных типов (rect/image/text).
// Узел позиционируется ЛЕВЫМ-ВЕРХОМ (как el.x/el.y и как ждёт Konva Transformer —
// поэтому поворот/ресайз не кривят). flip = scaleX/scaleY = -1: Konva отражает
// вокруг origin узла (x=0), сдвигая контент на -width; компенсируем позицию
// сдвигом на +width, чтобы отражение было «на месте». rotation Konva применяет
// вокруг origin (левый-верх) — совпадает с рамкой Transformer.
function flipBlendConfig(el, bboxW, bboxH) {
  return {
    x: el.x + (el.flipX ? bboxW : 0),
    y: el.y + (el.flipY ? bboxH : 0),
    scaleX: el.flipX ? -1 : 1,
    scaleY: el.flipY ? -1 : 1,
    rotation: el.rotation,
    globalCompositeOperation: blendModeToOp(el.blendMode),
  }
}

// TEXT рендерится как Konva.Label (Group: Tag-фон + Text).
// height берём фактическую (текст авто-высоты) — приблизим через fontSize*lineHeight,
// но для центрирования offset важна ширина; по высоте центрируем по el.height.
function textLabelConfig(el) {
  return {
    id: el.id,
    ...flipBlendConfig(el, el.width, el.height),
    opacity: el.opacity,
    visible: el.visible && store.editingElementId !== el.id,
    draggable: draggableFor(el),
  }
}
function textTagConfig(el) {
  return { fill: el.backgroundColor || 'transparent', cornerRadius: 2 }
}
function textTextConfig(el) {
  return {
    text: el.content,
    width: el.width,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontStyle: el.fontStyle,
    textDecoration: el.textDecoration === 'underline' ? 'underline' : '',
    align: el.align,
    fill: el.color,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    padding: el.padding,
  }
}

// IMAGE: группа с клипом (скругление + обрезка contain/cover) + картинка внутри
function imageGroupConfig(el) {
  const w = el.width, h = el.height, r = Math.min(el.cornerRadius, w / 2, h / 2)
  return {
    id: el.id,
    ...flipBlendConfig(el, w, h),
    opacity: el.opacity,
    visible: el.visible,
    draggable: draggableFor(el),
    clipFunc: (ctx) => {
      ctx.beginPath()
      if (r > 0) {
        ctx.moveTo(r, 0)
        ctx.arcTo(w, 0, w, h, r)
        ctx.arcTo(w, h, 0, h, r)
        ctx.arcTo(0, h, 0, 0, r)
        ctx.arcTo(0, 0, w, 0, r)
      } else {
        ctx.rect(0, 0, w, h)
      }
      ctx.closePath()
    },
  }
}
// Строит CSS-фильтр-строку цветокоррекции картинки (как renderCharWithFilters
// в редакторе токенов). 'none' если всё по умолчанию.
function imageCssFilter(el) {
  // Дефолты на случай элементов без полей коррекции (старые/загруженные шаблоны)
  const hue = el.hue ?? 0
  const sat = el.saturation ?? 100
  const bri = el.brightness ?? 100
  const con = el.contrast ?? 100
  const f = []
  if (hue !== 0) f.push(`hue-rotate(${hue}deg)`)
  if (sat !== 100) f.push(`saturate(${sat}%)`)
  if (bri !== 100) f.push(`brightness(${bri}%)`)
  if (con !== 100) f.push(`contrast(${con}%)`)
  return f.length ? f.join(' ') : 'none'
}

function imageInnerConfig(el) {
  const img = imageFor(el.url)
  if (!img) return null
  const w = el.width, h = el.height
  const iw = img.width, ih = img.height
  const filter = imageCssFilter(el)

  // Геометрия отрисовки по режиму fit (dx,dy,dw,dh + опциональный crop источника)
  let draw
  if (el.fit === 'contain') {
    const s = Math.min(w / iw, h / ih)
    draw = { dx: (w - iw * s) / 2, dy: (h - ih * s) / 2, dw: iw * s, dh: ih * s, crop: null }
  } else if (el.fit === 'cover') {
    const s = Math.max(w / iw, h / ih)
    const cw = w / s, ch = h / s
    draw = { dx: 0, dy: 0, dw: w, dh: h, crop: { x: (iw - cw) / 2, y: (ih - ch) / 2, w: cw, h: ch } }
  } else {
    draw = { dx: 0, dy: 0, dw: w, dh: h, crop: null } // fill
  }

  // sceneFunc даёт хук на ctx.filter (Konva-конфиг image такого не умеет).
  // Тень/hitFunc не задаём — картинка внутри клип-группы, клики ловит хит-rect группы.
  return {
    listening: false,
    sceneFunc: (ctx) => {
      ctx.save()
      if (filter !== 'none') ctx.filter = filter
      if (draw.crop) {
        ctx.drawImage(img, draw.crop.x, draw.crop.y, draw.crop.w, draw.crop.h, draw.dx, draw.dy, draw.dw, draw.dh)
      } else {
        ctx.drawImage(img, draw.dx, draw.dy, draw.dw, draw.dh)
      }
      ctx.restore()
    },
  }
}
// Плейсхолдер, пока картинка не загрузилась / нет url
function imagePlaceholderConfig(el) {
  return {
    x: 0, y: 0, width: el.width, height: el.height,
    fill: 'rgba(255,255,255,0.08)',
    stroke: 'rgba(255,255,255,0.2)',
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
  }
}

function rectConfig(el) {
  return {
    id: el.id,
    ...flipBlendConfig(el, el.width, el.height),
    width: el.width, height: el.height,
    fill: el.fill === 'none' ? undefined : el.fill,
    stroke: el.strokeWidth > 0 ? el.stroke : undefined,
    strokeWidth: el.strokeWidth,
    cornerRadius: el.cornerRadius,
    opacity: el.opacity,
    visible: el.visible,
    draggable: draggableFor(el),
  }
}

// Эллипс: Konva Ellipse уже рисуется от собственного центра (0,0), поэтому
// origin в центре без offset — flip (scale ±1) и rotation работают вокруг
// центра естественно. x/y = центр bbox.
function ellipseConfig(el) {
  return {
    id: el.id,
    x: el.x + el.width / 2,
    y: el.y + el.height / 2,
    radiusX: el.width / 2,
    radiusY: el.height / 2,
    scaleX: el.flipX ? -1 : 1,
    scaleY: el.flipY ? -1 : 1,
    rotation: el.rotation,
    globalCompositeOperation: blendModeToOp(el.blendMode),
    fill: el.fill === 'none' ? undefined : el.fill,
    stroke: el.strokeWidth > 0 ? el.stroke : undefined,
    strokeWidth: el.strokeWidth,
    opacity: el.opacity,
    visible: el.visible,
    draggable: draggableFor(el),
  }
}

// --- Сетка (uiLayer, не экспортируется) ---
const GRID_STEP = 50
const gridV = computed(() => {
  if (!store.showGrid) return []
  const out = []
  for (let x = GRID_STEP; x < store.document.width; x += GRID_STEP)
    out.push([x, 0, x, store.document.height])
  return out
})
const gridH = computed(() => {
  if (!store.showGrid) return []
  const out = []
  for (let y = GRID_STEP; y < store.document.height; y += GRID_STEP)
    out.push([0, y, store.document.width, y])
  return out
})

// --- Трансформер ---
const transformerConfig = {
  rotateEnabled: true,
  keepRatio: false,
  ignoreStroke: true,
  borderStroke: '#c4954a',
  anchorStroke: '#c4954a',
  anchorFill: '#21212a',
  anchorSize: 8,
  rotateAnchorOffset: 24,
  // Не даём схлопнуть элемент в ноль
  boundBoxFunc: (oldBox, newBox) =>
    Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox,
}

function updateTransformer() {
  const tr = transformerRef.value?.getNode()
  const stage = stageRef.value?.getStage()
  if (!tr || !stage) return
  tr.nodes(getTransformerNodes(store.selectedIds, stage, store.elements))
  tr.getLayer()?.batchDraw()
}

watch(
  () => [store.selectedIds.slice(), store.elements.map((e) => e.locked + ':' + e.id).join('|')],
  () => nextTick(updateTransformer),
  { deep: true },
)

// --- Drag / Transform элементов ---
function onElementDragStart() {
  history.record(store)
}

// Конвертирует позицию Konva-узла (node.x()/y()) обратно в левый-верх el.x/el.y.
// Схемы координат по типу:
//  - эллипс: node origin = ЦЕНТР bbox → вычитаем половину размеров;
//  - rect/image/text: node origin = левый-верх, но при flip позиция сдвинута
//    на +width/+height (см. flipBlendConfig) → вычитаем сдвиг обратно.
function nodeToTopLeft(node, el) {
  if (el.type === 'SHAPE' && el.shapeType === 'ellipse') {
    return { x: Math.round(node.x() - el.width / 2), y: Math.round(node.y() - el.height / 2) }
  }
  return {
    x: Math.round(node.x() - (el.flipX ? el.width : 0)),
    y: Math.round(node.y() - (el.flipY ? el.height : 0)),
  }
}

function onElementDragEnd(e) {
  const node = e.target
  const el = store.elements.find((x) => x.id === node.id())
  if (!el) return
  store.updateElement(el.id, nodeToTopLeft(node, el))
}

function onTransformStart() {
  history.record(store)
}

// Итоговая геометрия узла из ЖИВОГО scale: scale «впечён» в width/height, знак
// flip отделён (живёт во флаге el.flipX/flipY). Читаем текущий scale узла ×
// текущий размер (у текста — ширина внутреннего Text, у остального — el.width из
// стора, т.к. Konva.Group своего width не имеет). Ничего не мутирует.
function readNodeGeometry(node, el) {
  const sx = Math.abs(node.scaleX())
  const sy = Math.abs(node.scaleY())
  const rotation = Math.round(node.rotation() * 10) / 10

  if (el.type === 'SHAPE' && el.shapeType === 'ellipse') {
    const newW = Math.max(8, Math.round(el.width * sx))
    const newH = Math.max(8, Math.round(el.height * sy))
    return { width: newW, height: newH, x: Math.round(node.x() - newW / 2), y: Math.round(node.y() - newH / 2), rotation }
  }

  if (el.type === 'TEXT') {
    // Ширину читаем с внутреннего Text-узла (он и есть носитель размера при
    // перетекании), а не с базы — живой onTransform накапливает её через node.
    const inner = node.getText?.()
    const curW = inner ? inner.width() : el.width
    const newW = Math.max(30, Math.round(curW * sx))
    const x = Math.round(node.x() - (el.flipX ? newW : 0))
    const y = Math.round(node.y() - (el.flipY ? el.height : 0))
    return { width: newW, height: el.height, x, y, rotation }
  }

  // image/rect: scale читаем на transformend и впекаем в el.width/height (во
  // время жеста scale живёт на узле — Konva масштабирует картинку/прямоугольник
  // равномерно, без «плохой» деформации, поэтому live-нормализация не нужна).
  const newW = Math.max(8, Math.round(el.width * sx))
  const newH = Math.max(8, Math.round(el.height * sy))
  const x = Math.round(node.x() - (el.flipX ? newW : 0))
  const y = Math.round(node.y() - (el.flipY ? newH : 0))
  return { width: newW, height: newH, x, y, rotation }
}

// Живой transform: ТОЛЬКО для текста «сплющиваем» scale в ширину Text-узла, чтобы
// буквы не растягивались, а текст перетекал. Механика Transformer инкрементальная
// (каждый кадр строит рамку из текущих attrs узла), поэтому сброс scale→1 с
// переносом в width корректно накапливает размер. Для image/rect/ellipse не
// вмешиваемся — Konva сам рисует scale, деформации нет.
function onTransform() {
  const tr = transformerRef.value?.getNode()
  tr?.nodes().forEach((node) => {
    const el = store.elements.find((x) => x.id === node.id())
    if (el?.type !== 'TEXT') return
    const inner = node.getText?.()
    if (!inner) return
    const sx = Math.abs(node.scaleX())
    // scaleY у текста игнорируем (высота авто) — сбрасываем, чтобы не тянуло по вертикали
    node.scaleY(el.flipY ? -1 : 1)
    if (sx === 1) return
    const newW = Math.max(30, inner.width() * sx)
    // Позиция left-top при flip: origin-сдвиг компенсируем по новой ширине
    const topLeftX = node.x() - (el.flipX ? inner.width() : 0)
    inner.width(newW)
    node.scaleX(el.flipX ? -1 : 1)
    node.x(topLeftX + (el.flipX ? newW : 0))
  })
}

// Конец жеста: снимаем финальную геометрию и коммитим в стор (один раз).
// Сбрасываем scale узла к знаку flip, чтобы конфиг из стора совпал с узлом.
function onTransformEnd() {
  const tr = transformerRef.value?.getNode()
  tr?.nodes().forEach((node) => {
    const el = store.elements.find((x) => x.id === node.id())
    if (!el) return
    const geo = readNodeGeometry(node, el)
    node.scaleX(el.flipX ? -1 : 1)
    node.scaleY(el.flipY ? -1 : 1)
    store.updateElement(el.id, geo)
  })
  tr?.forceUpdate()
}

// --- Клики по стейджу: выделение ---
let panMoved = false

function onStageClick(e) {
  if (panMoved) return // это был pan, не клик
  if (store.activeTool !== 'select') return
  handleStageClick(e, store)
}

function onStageDblClick(e) {
  const knownIds = new Set(store.elements.map((el) => el.id))
  const id = resolveElementId(e.target, knownIds)
  if (!id) return
  const el = store.elements.find((x) => x.id === id)
  if (el?.type === 'TEXT' && !el.locked) startTextEditing(el)
}

// --- Редактирование текста через textarea поверх холста ---
const editText = ref('')

const editingEl = computed(() =>
  store.elements.find((e) => e.id === store.editingElementId) || null,
)

const textareaStyle = computed(() => {
  const el = editingEl.value
  if (!el) return {}
  const z = viewZoom.value
  return {
    left: el.x * z + viewX.value + 'px',
    top: el.y * z + viewY.value + 'px',
    width: el.width * z + 'px',
    minHeight: Math.max(el.fontSize * el.lineHeight, 24) * z + 'px',
    fontFamily: el.fontFamily,
    fontSize: el.fontSize * z + 'px',
    fontWeight: el.fontStyle.includes('bold') ? 'bold' : 'normal',
    fontStyle: el.fontStyle.includes('italic') ? 'italic' : 'normal',
    textDecoration: el.textDecoration === 'underline' ? 'underline' : 'none',
    textAlign: el.align === 'justify' ? 'left' : el.align,
    color: el.color,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing * z + 'px',
    padding: el.padding * z + 'px',
    background: el.backgroundColor || 'transparent',
    transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
    transformOrigin: 'top left',
  }
})

function startTextEditing(el) {
  editText.value = el.content
  store.editingElementId = el.id
  nextTick(() => {
    textareaRef.value?.focus()
    textareaRef.value?.select()
  })
}

function commitTextEditing() {
  const el = editingEl.value
  if (el && editText.value !== el.content) {
    history.record(store)
    store.updateElement(el.id, { content: editText.value })
  }
  store.editingElementId = null
}

// --- Навигация (pan/zoom) — та же схема, что в редакторе токенов ---
let isSpaceDown = false
let isPanning = false
let panStart = { x: 0, y: 0 }
let panStartView = { x: 0, y: 0 }

function setCursor(cursor) {
  if (containerRef.value) containerRef.value.style.cursor = cursor
}

function zoomAt(px, py, factor) {
  const newZoom = Math.min(8, Math.max(0.05, viewZoom.value * factor))
  viewX.value = px - (px - viewX.value) * (newZoom / viewZoom.value)
  viewY.value = py - (py - viewY.value) * (newZoom / viewZoom.value)
  viewZoom.value = newZoom
}

function onZoomSlider(val) {
  const cx = containerW.value / 2
  const cy = containerH.value / 2
  viewX.value = cx - (cx - viewX.value) * (val / viewZoom.value)
  viewY.value = cy - (cy - viewY.value) * (val / viewZoom.value)
  viewZoom.value = val
}

let ro = null

onMounted(() => {
  ro = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect
    const firstMeasure = !containerW.value
    containerW.value = width
    containerH.value = height
    if (firstMeasure) centerView()
  })
  ro.observe(containerRef.value)
  containerW.value = containerRef.value.offsetWidth
  containerH.value = containerRef.value.offsetHeight
  centerView()

  bridge.setHandlers({
    getStageForExport: () => ({
      stage: stageRef.value?.getStage() ?? null,
      uiLayer: uiLayerRef.value?.getNode() ?? null,
    }),
    centerView,
  })

  const el = containerRef.value
  el.setAttribute('tabindex', '0')

  el.addEventListener('keydown', (e) => {
    // Не перехватываем клавиши, пока пользователь печатает в textarea
    if (store.editingElementId) return

    if (e.code === 'Space') {
      e.preventDefault()
      isSpaceDown = true
      setCursor('grab')
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
      e.preventDefault()
      history.undo(store)
    }
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
      e.preventDefault()
      history.redo(store)
    }
    if ((e.code === 'Delete' || e.code === 'Backspace') && store.selectedIds.length) {
      e.preventDefault()
      history.record(store)
      store.removeSelected()
    }
    if (e.code === 'Escape') {
      store.clearSelection()
    }
  })

  el.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpaceDown = false
      isPanning = false
      setCursor(store.activeTool === 'hand' ? 'grab' : '')
    }
  })

  el.addEventListener('mouseenter', () => el.focus({ preventScroll: true }))

  const stage = stageRef.value?.getStage()
  if (!stage) return

  // Delegation вместо индивидуальных @dragstart/@dragend/@transformstart/
  // @transformend на каждом узле в шаблоне — заодно убирает Vue-варнинг
  // "Extraneous non-emits event listeners" на v-group/v-label (компоненты
  // vue-konva, рендерящие несколько детей во фрагмент). Konva.Node#fire для
  // drag — обычное всплытие (bubbling) от потомка к родителю, поэтому 'dragstart'/
  // 'dragend' ловятся подпиской на elementsLayer. А вот Transformer эмитит
  // 'transformstart'/'transformend' через _fire (БЕЗ bubbling) на себе самом
  // (см. konva/lib/shapes/Transformer.js) — их нужно ловить на самом
  // transformerRef, не на слое.
  const elementsLayer = elementsLayerRef.value?.getNode()
  if (elementsLayer) {
    elementsLayer.on('dragstart', onElementDragStart)
    elementsLayer.on('dragend', onElementDragEnd)
  }
  const transformerNode = transformerRef.value?.getNode()
  if (transformerNode) {
    transformerNode.on('transformstart', onTransformStart)
    transformerNode.on('transform', onTransform)
    transformerNode.on('transformend', onTransformEnd)
  }

  stage.on('mousedown', () => {
    const pos = stage.getPointerPosition()
    panMoved = false
    if (isSpaceDown || store.activeTool === 'hand') {
      isPanning = true
      panStart = { x: pos.x, y: pos.y }
      panStartView = { x: viewX.value, y: viewY.value }
      setCursor('grabbing')
    }
  })

  stage.on('mousemove', () => {
    if (!isPanning) return
    const pos = stage.getPointerPosition()
    if (Math.hypot(pos.x - panStart.x, pos.y - panStart.y) > 3) panMoved = true
    viewX.value = panStartView.x + (pos.x - panStart.x)
    viewY.value = panStartView.y + (pos.y - panStart.y)
  })

  stage.on('mouseup', () => {
    isPanning = false
    if (isSpaceDown || store.activeTool === 'hand') setCursor('grab')
  })

  stage.on('wheel', (e) => {
    e.evt.preventDefault()
    const pos = stage.getPointerPosition()
    const factor = e.evt.deltaY > 0 ? 0.9 : 1.1
    if (e.evt.ctrlKey || e.evt.metaKey || isSpaceDown || store.activeTool === 'hand') {
      zoomAt(pos.x, pos.y, factor)
    }
  })
})

onUnmounted(() => {
  ro?.disconnect()
})

// Смена инструмента — курсор
watch(() => store.activeTool, (tool) => {
  setCursor(tool === 'hand' ? 'grab' : '')
})
</script>

<template>
  <div ref="containerRef" class="handout-canvas">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @click="onStageClick"
      @dblclick="onStageDblClick"
    >
      <!-- Слой 1: фон документа -->
      <v-layer>
        <v-rect v-if="store.document.background.type !== 'none'" :config="bgRectConfig" />
        <v-rect
          v-else
          :config="{ ...bgRectConfig, fill: 'rgba(255,255,255,0.03)' }"
        />
        <v-image v-if="bgTextureConfig" :config="bgTextureConfig" />
        <v-rect :config="docBorderConfig" />
      </v-layer>

      <!-- Слой 2: элементы (порядок массива = z-order). Drag/transform-события
           не биндятся на каждый узел — делегированы на весь слой в onMounted
           (см. комментарий там), это же убирает Vue-варнинг на v-group/v-label. -->
      <v-layer ref="elementsLayerRef">
        <template v-for="el in store.elements" :key="el.id">
          <!-- TEXT: Label = Tag (фон) + Text -->
          <v-label
            v-if="el.type === 'TEXT'"
            :config="textLabelConfig(el)"
          >
            <v-tag :config="textTagConfig(el)" />
            <v-text :config="textTextConfig(el)" />
          </v-label>

          <!-- IMAGE: группа с клипом (скругление) -->
          <v-group
            v-else-if="el.type === 'IMAGE'"
            :config="imageGroupConfig(el)"
          >
            <v-image v-if="imageInnerConfig(el)" :config="imageInnerConfig(el)" />
            <v-rect v-else :config="imagePlaceholderConfig(el)" />
            <!-- Прозрачный хит-рект: группа без него не ловит клики по пустым местам -->
            <v-rect :config="{ x: 0, y: 0, width: el.width, height: el.height, fill: 'rgba(0,0,0,0.001)' }" />
          </v-group>

          <!-- SHAPE -->
          <v-rect
            v-else-if="el.type === 'SHAPE' && el.shapeType === 'rect'"
            :config="rectConfig(el)"
          />
          <v-ellipse
            v-else-if="el.type === 'SHAPE' && el.shapeType === 'ellipse'"
            :config="ellipseConfig(el)"
          />
        </template>
      </v-layer>

      <!-- Слой 3: UI — сетка, трансформер (скрывается при экспорте) -->
      <v-layer ref="uiLayerRef">
        <template v-if="store.showGrid">
          <v-line
            v-for="(pts, i) in gridV"
            :key="'gv' + i"
            :config="{ points: pts, stroke: 'rgba(196,149,74,0.15)', strokeWidth: 1 / viewZoom, listening: false }"
          />
          <v-line
            v-for="(pts, i) in gridH"
            :key="'gh' + i"
            :config="{ points: pts, stroke: 'rgba(196,149,74,0.15)', strokeWidth: 1 / viewZoom, listening: false }"
          />
        </template>
        <v-transformer ref="transformerRef" :config="transformerConfig" />
      </v-layer>
    </v-stage>

    <!-- Редактирование текста: textarea точно поверх элемента -->
    <textarea
      v-if="editingEl"
      ref="textareaRef"
      v-model="editText"
      class="text-editor"
      :style="textareaStyle"
      @blur="commitTextEditing"
      @keydown.esc.prevent="commitTextEditing"
    />

    <ZoomNavigator
      :zoom="viewZoom"
      :min-zoom="0.05"
      :max-zoom="8"
      @update:zoom="onZoomSlider"
      @zoom-in="onZoomSlider(Math.min(8, viewZoom * 1.2))"
      @zoom-out="onZoomSlider(Math.max(0.05, viewZoom / 1.2))"
    />

    <HandoutHotkeyHelp />
  </div>
</template>

<style lang="scss" scoped>
.handout-canvas {
  position: relative;
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

.text-editor {
  position: absolute;
  z-index: 20;
  margin: 0;
  border: 1px dashed var(--color-accent);
  outline: none;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
