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

// Непрозрачный фон только для type==='color' — для 'texture' НЕ красим area
// сплошным цветом: прозрачные пиксели картинки должны остаться прозрачными
// (и на экране, и при экспорте в PNG/WebP), а не запекаться в белый.
const bgRectConfig = computed(() => ({
  x: 0, y: 0,
  width: store.document.width,
  height: store.document.height,
  fill: store.document.background.color,
  listening: false,
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
    listening: false,
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

// IMAGE: группа с клипом (скругление + обрезка contain/cover) + картинка внутри.
// width/height заданы как РЕАЛЬНЫЕ атрибуты узла (не только в замыкании clipFunc) —
// иначе Transformer не видит размер группы и живой ресайз (onElementLiveTransform)
// не может впечь scale в width/height.
function imageGroupConfig(el) {
  return {
    id: el.id,
    ...flipBlendConfig(el, el.width, el.height),
    width: el.width,
    height: el.height,
    opacity: el.opacity,
    visible: el.visible,
    draggable: draggableFor(el),
    // shape — сам узел (группа): читаем ЖИВУЮ геометрию, а не el.width/height из
    // замыкания (при live-ресайзе мутируется узел, конфиг догоняет через Vue позже).
    clipFunc: (ctx, shape) => {
      const w = shape.width(), h = shape.height()
      const r = Math.min(el.cornerRadius, w / 2, h / 2)
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
  const iw = img.width, ih = img.height
  const filter = imageCssFilter(el)

  // sceneFunc даёт хук на ctx.filter (Konva-конфиг image такого не умеет).
  // Тень/hitFunc не задаём — картинка внутри клип-группы, клики ловит хит-rect группы.
  // Геометрию (w/h) и режим fit пересчитываем ВНУТРИ sceneFunc от ЖИВОГО размера
  // родителя-группы — при ресайзе мутируется группа (onElementLiveTransform), и
  // картинка перекладывается по contain/cover в этом же кадре, без растяжения
  // (собственные width/height v-image через Vue могут ещё не обновиться).
  return {
    name: 'img-inner',
    listening: false,
    // Собственные width/height — чтобы у sceneFunc-шейпа был ненулевой getSelfRect
    // (иначе Transformer не измерит его в getClientRect группы). Живой ресайз
    // мутирует их синхронно (onElementLiveTransform), поэтому geometry sceneFunc
    // берёт с САМОГО шейпа (shape.width()/height()), а не с родителя.
    width: el.width,
    height: el.height,
    sceneFunc: (ctx, shape) => {
      const w = shape.width(), h = shape.height()

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
  // Не переворачиваем элемент перетаскиванием ручки за противоположную сторону:
  // Konva иначе даёт отрицательный scale, а decompose трактует горизонтальный
  // флип как «поворот 180° + вертикальный флип» (неоднозначность знака
  // детерминанта) — рамка глючила и переворачивалась не по той оси. Отражение —
  // только кнопками H/V в тулбаре (store.flipElement). flipEnabled:false
  // клампит ресайз у границы вместо зеркалирования.
  flipEnabled: false,
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

const ALL_ANCHORS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]
// У текста высота авто (перетекает) — вертикальный ресайз бессмыслен,
// оставляем только горизонтальные ручки.
const TEXT_ANCHORS = ['middle-left', 'middle-right']

function updateTransformer() {
  const tr = transformerRef.value?.getNode()
  const stage = stageRef.value?.getStage()
  if (!tr || !stage) return
  const nodes = getTransformerNodes(store.selectedIds, stage, store.elements)
  tr.nodes(nodes)
  const onlyText =
    nodes.length > 0 &&
    nodes.every((n) => store.elements.find((e) => e.id === n.id())?.type === 'TEXT')
  tr.enabledAnchors(onlyText ? TEXT_ANCHORS : ALL_ANCHORS)
  tr.getLayer()?.batchDraw()
}

watch(
  () => [store.selectedIds.slice(), store.elements.map((e) => e.locked + ':' + e.id).join('|')],
  () => nextTick(updateTransformer),
  { deep: true },
)

// Свойства картинки, влияющие ТОЛЬКО на sceneFunc (fit + цветокоррекция), не
// меняют ни один Konva-attr узла — vue-konva видит лишь новую ссылку sceneFunc и
// не всегда перерисовывает слой сам. Подписываемся на их сигнатуру и форсим
// batchDraw слоя элементов, чтобы смена «Вписать/Заполнить/Растянуть» и фильтры
// отражались на холсте сразу.
watch(
  () =>
    store.elements
      .filter((e) => e.type === 'IMAGE')
      .map((e) => `${e.id}:${e.fit}:${e.hue}:${e.saturation}:${e.brightness}:${e.contrast}`)
      .join('|'),
  () => nextTick(() => elementsLayerRef.value?.getNode()?.batchDraw()),
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

// Живой ресайз: Konva эмитит 'transform' на узле СИНХРОННО каждый кадр жеста —
// до того как Vue узнаёт об изменении. Тут же конвертируем scaleX/scaleY в
// реальные width/height ПРЯМО на Konva-узле (минуя store) и сбрасываем scale в
// 1 — Konva перерисовывает узел с новой геометрией в ТОМ ЖЕ кадре, поэтому нет
// растяжения (к отрисовке scale всегда 1) и рамка Transformer совпадает с узлом
// (нет дёрганья: узел и рамка согласованы синхронно, без гонки с Vue-реактивностью).
// Официальный приём Konva («Resize Text» в доках). store обновляется ТОЛЬКО на
// transformend (см. onTransformEnd). Событие 'transform' Transformer эмитит через
// _fire на СЕБЕ (без всплытия к слою), поэтому подписка на transformerRef, а не на
// elementsLayer; e.target — конкретный изменяемый узел (по узлу на мультивыделении).
function onElementLiveTransform(e) {
  const node = e.target
  const el = store.elements.find((x) => x.id === node.id())
  if (!el) return

  // Размер берём по модулю scale. Знак scale = ЖИВОЙ знак от Konva: если тянуть
  // ручку за противоположную сторону, Konva сам делает scale отрицательным
  // (переворот) — сохраняем этот знак на узле (НЕ навязываем сохранённый флаг),
  // иначе рамка/позиция глючат при пересечении. Флаг el.flipX/flipY доводится в
  // стор только на transformend (по финальному знаку узла).
  const sgnX = node.scaleX() < 0 ? -1 : 1
  const sgnY = node.scaleY() < 0 ? -1 : 1
  const sx = Math.abs(node.scaleX())
  const sy = Math.abs(node.scaleY())

  if (el.type === 'TEXT') {
    // Активны только горизонтальные ручки (TEXT_ANCHORS) — scaleY всегда 1,
    // высота авто (текст перетекает по ширине).
    const newWidth = Math.max(30, node.width() * sx)
    node.getText().width(newWidth) // Konva.Label: прямой доступ к Text-child
    node.width(newWidth)
    node.scaleX(sgnX)
    node.scaleY(sgnY)
    // Tag-фон Label подгоняется под Text автоматически (встроено в Konva.Label)
  } else if (el.type === 'IMAGE') {
    // Группа сама по себе НЕ имеет измеряемого размера: её getClientRect (по нему
    // Transformer считает жест) = объединение clientRect'ов ДЕТЕЙ. Поэтому мало
    // впечь scale в width/height группы — надо синхронно догнать РАЗМЕРЫ ДЕТЕЙ
    // (картинка img-inner + хит-rect img-hit), иначе бокс группы (по стейл-детям)
    // разъезжается с реальным жестом → картинку раздувает/уносит.
    const newW = Math.max(20, node.width() * sx)
    const newH = Math.max(20, node.height() * sy)
    node.setAttrs({ width: newW, height: newH, scaleX: sgnX, scaleY: sgnY })
    // clipFunc читает живой размер группы (shape.width()/height()), sceneFunc —
    // свой (img-inner ниже), перекладывая картинку по fit в этом же кадре.
    const inner = node.findOne('.img-inner')
    if (inner) inner.setAttrs({ width: newW, height: newH })
    const hit = node.findOne('.img-hit')
    if (hit) hit.setAttrs({ width: newW, height: newH })
  } else if (el.type === 'SHAPE' && el.shapeType === 'ellipse') {
    node.setAttrs({
      radiusX: Math.max(4, node.radiusX() * sx),
      radiusY: Math.max(4, node.radiusY() * sy),
      scaleX: sgnX,
      scaleY: sgnY,
    })
  } else if (el.type === 'SHAPE') {
    node.setAttrs({
      width: Math.max(8, node.width() * sx),
      height: Math.max(8, node.height() * sy),
      scaleX: sgnX,
      scaleY: sgnY,
    })
  }

  node.getLayer()?.batchDraw()
}

function onTransformStart() {
  history.record(store)
}

// Конец жеста: scale уже впечён в width/height покадрово (onElementLiveTransform),
// узел имеет корректную геометрию и scale=±1. Финальный ЗНАК scale = актуальный
// флаг flip (пользователь мог перевернуть элемент, протянув ручку за
// противоположную сторону) — фиксируем flipX/flipY по нему, а позицию узла
// приводим к левому-верху с тем же ЗНАКОМ (не по старому el.flipX). Эллипс
// центр-based — flip не сдвигает позицию, только пишем флаг.
function onTransformEnd() {
  const tr = transformerRef.value?.getNode()
  if (!tr) return

  tr.nodes().forEach((node) => {
    const el = store.elements.find((x) => x.id === node.id())
    if (!el) return
    const rotation = Math.round(node.rotation() * 10) / 10
    const flipX = node.scaleX() < 0
    const flipY = node.scaleY() < 0
    let updates = { rotation, flipX, flipY }

    if (el.type === 'SHAPE' && el.shapeType === 'ellipse') {
      // центр-based: node.x()/y() = центр bbox (flip вокруг центра, без сдвига)
      const w = Math.max(8, Math.round(node.radiusX() * 2))
      const h = Math.max(8, Math.round(node.radiusY() * 2))
      updates = { ...updates, width: w, height: h, x: Math.round(node.x() - w / 2), y: Math.round(node.y() - h / 2) }
    } else if (el.type === 'TEXT') {
      const w = Math.round(node.width())
      updates = {
        ...updates,
        width: w,
        x: Math.round(node.x() - (flipX ? w : 0)),
        y: Math.round(node.y() - (flipY ? el.height : 0)),
      }
    } else {
      const w = Math.round(node.width())
      const h = Math.round(node.height())
      updates = {
        ...updates,
        width: w,
        height: h,
        x: Math.round(node.x() - (flipX ? w : 0)),
        y: Math.round(node.y() - (flipY ? h : 0)),
      }
    }

    store.updateElement(el.id, updates)
  })

  // Рамку обновляем ПОСЛЕ того, как Vue применит финальные конфиги к узлам
  // (микротаск) — иначе строится по старой геометрии и «уезжает» до клика.
  nextTick(() => {
    tr.forceUpdate()
    tr.getLayer()?.batchDraw()
  })
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
let onFontsLoadingDone = null

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

  // Самохостed шрифты (Caveat/Marck Script/Neucha/PT Mono/Cousine/Overpass Mono)
  // грузятся браузером асинхронно при первом обращении. Konva рисует текст
  // синхронно текущим (фолбэк) шрифтом и САМ не перерисует холст, когда файл
  // догрузится — 'loadingdone' на document.fonts форсит один redraw на весь
  // документ сразу, как только шрифты готовы (без per-элементного отслеживания).
  onFontsLoadingDone = () => elementsLayerRef.value?.getNode()?.batchDraw()
  document.fonts?.addEventListener('loadingdone', onFontsLoadingDone)

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
  // vue-konva, рендерящие несколько детей во фрагмент). ВАЖНО про всплытие:
  // drag-события (dragstart/dragend) идут через fire(..., true) с bubbling —
  // ловятся на elementsLayer. А Transformer эмитит 'transform'/'transformstart'/
  // 'transformend' через _fire (БЕЗ bubbling) на СЕБЕ (см. Transformer.js:
  // this._fire('transform', { target: node })) — до слоя они НЕ доходят, поэтому
  // все три ловим на самом transformerRef; в 'transform' e.target — конкретный
  // изменяемый узел (при мультивыделении событие эмитится по узлу на каждый).
  const elementsLayer = elementsLayerRef.value?.getNode()
  if (elementsLayer) {
    elementsLayer.on('dragstart', onElementDragStart)
    elementsLayer.on('dragend', onElementDragEnd)
  }
  const transformerNode = transformerRef.value?.getNode()
  if (transformerNode) {
    transformerNode.on('transformstart', onTransformStart)
    transformerNode.on('transform', onElementLiveTransform)
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
  if (onFontsLoadingDone) document.fonts?.removeEventListener('loadingdone', onFontsLoadingDone)
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
      <!-- Слой 1: фон документа. Для type==='texture' НЕ красим area сплошным
           цветом (см. bgRectConfig) — прозрачные пиксели картинки остаются
           прозрачными пикселями Konva-канваса и просвечивают DOM-фон
           .handout-canvas ПОД стейджем (та же шахматка, что и снаружи документа,
           см. стили ниже) — никакой второй шахматки рисовать не нужно, и она не
           может разъехаться по масштабу с внешней, т.к. это один и тот же DOM-фон.
           Так же и в экспортированном PNG/WebP — настоящая альфа, а не
           запечённый цвет/узор. -->
      <v-layer>
        <v-rect v-if="store.document.background.type === 'color'" :config="bgRectConfig" />
        <v-rect
          v-else-if="store.document.background.type === 'none'"
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
            <!-- Прозрачный хит-рект: группа без него не ловит клики по пустым местам.
                 name='img-hit' — живой ресайз синхронно тянет его размер (см.
                 onElementLiveTransform), чтобы getClientRect группы совпадал с жестом. -->
            <v-rect :config="{ name: 'img-hit', x: 0, y: 0, width: el.width, height: el.height, fill: 'rgba(0,0,0,0.001)' }" />
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
