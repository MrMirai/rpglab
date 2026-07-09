import { defineStore } from 'pinia'
import { ref } from 'vue'
import { generateId, getElementDefaults, centerInViewport } from './composables/useHandoutElements'

// Пресеты размеров документа (px при 96dpi: A4 = 210мм → 794px)
export const SIZE_PRESETS = [
  { id: 'a4-portrait', label: 'A4 портрет', width: 794, height: 1123 },
  { id: 'a4-landscape', label: 'A4 альбом', width: 1123, height: 794 },
  { id: 'a5', label: 'A5', width: 559, height: 794 },
  { id: 'card', label: 'Карточка', width: 375, height: 525 },
  { id: 'square', label: 'Квадрат', width: 794, height: 794 },
  { id: 'scroll', label: 'Свиток', width: 400, height: 1000 },
  { id: 'custom', label: 'Произвольный', width: null, height: null },
]

// Режимы наложения. id элемента → globalCompositeOperation для Konva/canvas.
// 'normal' = source-over (обычный). Набор как в Figma-подобных редакторах.
export const BLEND_MODES = [
  { id: 'normal', label: 'Обычный', op: 'source-over' },
  { id: 'darken', label: 'Затемнение', op: 'darken' },
  { id: 'multiply', label: 'Умножение', op: 'multiply' },
  { id: 'color-burn', label: 'Затемнение основы', op: 'color-burn' },
  { id: 'lighten', label: 'Замена светлым', op: 'lighten' },
  { id: 'screen', label: 'Экран', op: 'screen' },
  { id: 'color-dodge', label: 'Осветление основы', op: 'color-dodge' },
  { id: 'overlay', label: 'Перекрытие', op: 'overlay' },
  { id: 'soft-light', label: 'Мягкий свет', op: 'soft-light' },
  { id: 'hard-light', label: 'Жёсткий свет', op: 'hard-light' },
  { id: 'difference', label: 'Разница', op: 'difference' },
  { id: 'exclusion', label: 'Исключение', op: 'exclusion' },
  { id: 'hue', label: 'Цветовой тон', op: 'hue' },
  { id: 'saturation', label: 'Насыщенность', op: 'saturation' },
  { id: 'color', label: 'Цветность', op: 'color' },
  { id: 'luminosity', label: 'Свечение', op: 'luminosity' },
]

// id бленд-мода → globalCompositeOperation (для рендера)
export function blendModeToOp(id) {
  return BLEND_MODES.find((m) => m.id === id)?.op || 'source-over'
}

export const useHandoutStore = defineStore('handout', () => {
  // --- Документ ---
  const document = ref({
    width: 794,
    height: 1123,
    sizePreset: 'a4-portrait',
    background: {
      type: 'color', // color | texture | none
      color: '#f5ecd8',
      textureUrl: null,
    },
  })

  // Порядок в массиве = порядок рендера (последний — поверх всех)
  const elements = ref([])

  const selectedIds = ref([])
  const activeTool = ref('select') // select | hand
  const showGrid = ref(false)
  const editingElementId = ref(null) // текст в режиме textarea-редактирования
  const exportModalOpen = ref(false)

  // Вьюпорт холста — синхронизируется из HandoutCanvas, нужен для
  // добавления новых элементов в центр видимой области.
  const viewport = ref({ x: 0, y: 0, zoom: 1, w: 0, h: 0 })

  function setViewport(v) {
    viewport.value = v
  }

  // --- Элементы ---

  function addElement(type, partialProps = {}) {
    const defaults = getElementDefaults(type)
    const el = { id: generateId(), ...defaults, ...partialProps }
    if (partialProps.x === undefined && partialProps.y === undefined) {
      const pos = centerInViewport(el.width, el.height, viewport.value, document.value)
      el.x = pos.x
      el.y = pos.y
    }
    elements.value.push(el)
    selectedIds.value = [el.id]
    return el
  }

  function updateElement(id, props) {
    const el = elements.value.find((e) => e.id === id)
    if (el) Object.assign(el, props)
  }

  // Отражение по горизонтали/вертикали (переключает флаг flipX/flipY)
  function flipElement(id, axis) {
    const el = elements.value.find((e) => e.id === id)
    if (!el) return
    if (axis === 'x') el.flipX = !el.flipX
    else if (axis === 'y') el.flipY = !el.flipY
  }

  // Поворот на ±90° (нормализуем в диапазон -180..180 для читаемости поля)
  function rotateElement90(id, dir = 1) {
    const el = elements.value.find((e) => e.id === id)
    if (!el) return
    let r = (el.rotation + dir * 90) % 360
    if (r > 180) r -= 360
    if (r < -180) r += 360
    el.rotation = r
  }

  // Сброс цветовой коррекции изображения
  function resetImageFilters(id) {
    updateElement(id, { hue: 0, saturation: 100, brightness: 100, contrast: 100 })
  }

  function removeElement(id) {
    elements.value = elements.value.filter((e) => e.id !== id)
    selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
    if (editingElementId.value === id) editingElementId.value = null
  }

  function removeSelected() {
    const ids = new Set(selectedIds.value)
    elements.value = elements.value.filter((e) => !ids.has(e.id))
    selectedIds.value = []
    if (ids.has(editingElementId.value)) editingElementId.value = null
  }

  function duplicateElement(id) {
    const el = elements.value.find((e) => e.id === id)
    if (!el) return null
    const copy = JSON.parse(JSON.stringify(el))
    copy.id = generateId()
    copy.x += 20
    copy.y += 20
    elements.value.push(copy)
    selectedIds.value = [copy.id]
    return copy
  }

  // Перемещение по z-порядку. В массиве последний рисуется поверх,
  // поэтому 'up' (визуально выше) = ближе к концу массива.
  function reorderElement(id, direction) {
    const idx = elements.value.findIndex((e) => e.id === id)
    if (idx === -1) return
    const arr = elements.value
    const [el] = arr.splice(idx, 1)
    if (direction === 'top') arr.push(el)
    else if (direction === 'bottom') arr.unshift(el)
    else if (direction === 'up') arr.splice(Math.min(idx + 1, arr.length), 0, el)
    else if (direction === 'down') arr.splice(Math.max(idx - 1, 0), 0, el)
    else arr.splice(idx, 0, el)
  }

  // --- Выделение ---

  function setSelected(ids) {
    selectedIds.value = [...ids]
  }

  function toggleSelected(id) {
    const i = selectedIds.value.indexOf(id)
    if (i === -1) selectedIds.value.push(id)
    else selectedIds.value.splice(i, 1)
  }

  function clearSelection() {
    selectedIds.value = []
  }

  // --- Документ ---

  function setDocument(props) {
    Object.assign(document.value, props)
  }

  function setBackground(props) {
    Object.assign(document.value.background, props)
  }

  // Полная замена состояния (загрузка шаблона / undo-restore)
  function replaceDocument(state) {
    if (state.document) document.value = JSON.parse(JSON.stringify(state.document))
    if (state.elements) elements.value = JSON.parse(JSON.stringify(state.elements))
    // Чистим выделение от исчезнувших элементов
    const alive = new Set(elements.value.map((e) => e.id))
    selectedIds.value = selectedIds.value.filter((id) => alive.has(id))
    if (editingElementId.value && !alive.has(editingElementId.value)) editingElementId.value = null
  }

  function setActiveTool(tool) {
    activeTool.value = tool
  }

  function toggleGrid() {
    showGrid.value = !showGrid.value
  }

  function openExportModal() {
    exportModalOpen.value = true
  }
  function closeExportModal() {
    exportModalOpen.value = false
  }

  return {
    document,
    elements,
    selectedIds,
    activeTool,
    showGrid,
    editingElementId,
    exportModalOpen,
    viewport,
    setViewport,
    addElement,
    updateElement,
    flipElement,
    rotateElement90,
    resetImageFilters,
    removeElement,
    removeSelected,
    duplicateElement,
    reorderElement,
    setSelected,
    toggleSelected,
    clearSelection,
    setDocument,
    setBackground,
    replaceDocument,
    setActiveTool,
    toggleGrid,
    openExportModal,
    closeExportModal,
  }
})
