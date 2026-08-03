import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const GRID_CELLS = 5

export const useEditorStore = defineStore('editor', () => {
  // Размер одной клетки = размер рамки
  const canvasSize = ref(500)

  // Полный рабочий холст (5×5 клеток)
  const fullCanvasSize = computed(() => canvasSize.value * GRID_CELLS)
  // Смещение центральной клетки (рамки) от края холста
  const frameOffset = computed(() => canvasSize.value * Math.floor(GRID_CELLS / 2))

  // Персонаж
  const charImage = ref(null)      // HTMLImageElement
  const charX = ref(0)
  const charY = ref(0)
  const charScale = ref(1)

  // Рамка
  const frameImage = ref(null)     // HTMLImageElement
  const frameFileName = ref('')

  // Превью URL (object URLs) - в сторе, чтобы не терялись при размонтировании компонентов
  const charPreviewUrl = ref(null)
  const framePreviewUrl = ref(null)
  const bgPreviewUrl = ref(null)

  // Маска окна рамки считается автоматически (useAutoMask), загрузки своей нет
  const maskVersion = ref(0)       // инкремент форсирует пересчёт маски

  // Параметры маски вылезания
  const overflowY = ref(35)        // % от высоты холста
  const overflowSoft = ref(20)     // px, мягкость перехода

  // Активный инструмент
  const activeTool = ref('move')   // 'move' | 'brush' | 'hand' | 'lasso'

  // Кисть (стереть/восстановить)
  const brushSize = ref(30)
  const brushHardness = ref(50)
  const brushMode = ref('restore')  // 'restore' | 'erase'
  function setBrushMode(mode) { brushMode.value = mode }

  // Лассо (безье-контур): 'add' - заливает область в маску (как «Восстановить»),
  // 'subtract' - вырезает (как «Стереть»)
  const lassoMode = ref('add')     // 'add' | 'subtract'
  function setLassoMode(mode) { lassoMode.value = mode }

  // Фильтры персонажа
  const charHue = ref(0)              // -180..180 градусов
  const charSaturation = ref(100)     // 0..200 %
  const charBrightness = ref(100)     // 0..200 %
  const charContrast = ref(100)       // 0..200 %
  const charLuminosity = ref(0)       // -100..100 (через brightness слоя)

  // Тень персонажа
  const charShadowEnabled = ref(false)
  const charShadowColor = ref('#000000')
  const charShadowBlur = ref(20)
  const charShadowOffsetX = ref(0)
  const charShadowOffsetY = ref(8)
  const charShadowOpacity = ref(60)   // 0..100 %

  function resetCharFilters() {
    charHue.value = 0
    charSaturation.value = 100
    charBrightness.value = 100
    charContrast.value = 100
    charLuminosity.value = 0
    charShadowEnabled.value = false
    charShadowBlur.value = 20
    charShadowOffsetX.value = 0
    charShadowOffsetY.value = 8
    charShadowOpacity.value = 60
  }

  // --- Источники света ---
  // Свет от объектов персонажа (светящийся меч, факел) должен падать на рамку и
  // на самого персонажа. Каждый источник - радиальный градиент, который
  // накладывается поверх слоёв в screen-режиме.
  // Координаты x/y - в системе рамки (0..canvasSize), как charX/charY: центр
  // рамки = (canvasSize/2, canvasSize/2). Так свет не «уезжает» при смене размера.
  const lights = ref([])
  let lightIdSeq = 0

  // Инструмент «Свет» показывает на холсте перетаскиваемые маркеры источников
  const selectedLightId = ref(null)

  function createLight(overrides = {}) {
    return {
      id: `light-${++lightIdSeq}`,
      // Позиция: 'manual' - задаётся драгом маркера/слайдерами,
      // 'auto' - привязана к центру ярких пикселей персонажа (светящийся меч)
      mode: 'manual',
      x: canvasSize.value / 2,
      y: canvasSize.value / 2,
      color: '#ffcc66',
      radius: 240,
      intensity: 70,     // 0..100 %
      falloff: 50,       // 0..100 - мягкость спада (0 - резкий край, 100 - очень плавный)
      onFrame: true,     // подсвечивать рамку
      onChar: true,      // подсвечивать персонажа
      visible: true,
      ...overrides,
    }
  }

  function addLight(overrides = {}) {
    const light = createLight(overrides)
    lights.value.push(light)
    selectedLightId.value = light.id
    return light
  }

  function removeLight(id) {
    const i = lights.value.findIndex((l) => l.id === id)
    if (i === -1) return
    lights.value.splice(i, 1)
    if (selectedLightId.value === id) {
      selectedLightId.value = lights.value.length ? lights.value[lights.value.length - 1].id : null
    }
  }

  function updateLight(id, patch) {
    const light = lights.value.find((l) => l.id === id)
    if (light) Object.assign(light, patch)
  }

  function selectLight(id) { selectedLightId.value = id }

  function clearLights() {
    lights.value = []
    selectedLightId.value = null
  }

  const hasLights = computed(() => lights.value.length > 0)

  // Сетка и превью
  const showGrid = ref(false)
  const previewMode = ref(false)

  // Фон токена
  const bgType = ref('none')        // 'none' | 'color' | 'image' | 'auto'
  const bgColor = ref('#1a1a2e')
  const bgImage = ref(null)         // HTMLImageElement

  // Авто-фон (процедурный градиент + шум)
  const bgAutoColor = ref('#28283c')    // базовый цвет (hex)
  const bgCenterLight = ref(0.7)        // множитель яркости центра
  const bgEdgeLight = ref(1.3)          // множитель яркости краёв
  const bgNoiseStrength = ref(15)       // сила шума, % (0..100)
  const bgGrain = ref(6)                // размер крупинок шума
  const bgNoiseType = ref('perlin')     // 'random' | 'perlin'

  // Режимы отображения
  const showMaskOverlay = ref(false)
  const showHidden = ref(false)     // призрак скрытых масками частей персонажа

  // История действий (флаги для кнопок тулбара)
  const canUndo = ref(false)
  const canRedo = ref(false)

  // Модальное окно экспорта
  const exportModalOpen = ref(false)

  // Вычисляемые
  const hasChar = computed(() => charImage.value !== null)
  const hasFrame = computed(() => frameImage.value !== null)
  const isReady = computed(() => hasChar.value && hasFrame.value)

  // Действия
  function setActiveTool(tool) { activeTool.value = tool }
  function toggleGrid() { showGrid.value = !showGrid.value }
  function togglePreview() { previewMode.value = !previewMode.value }

  function toggleMaskOverlay() {
    showMaskOverlay.value = !showMaskOverlay.value
    if (showMaskOverlay.value) showHidden.value = false
  }
  function toggleHidden() {
    showHidden.value = !showHidden.value
    if (showHidden.value) showMaskOverlay.value = false
  }

  function setBgType(type) { bgType.value = type }
  function setBgColor(color) { bgColor.value = color }
  function loadBgImage(img, url = null) {
    bgImage.value = img
    bgType.value = img ? 'image' : 'none'
    if (url) {
      if (bgPreviewUrl.value) URL.revokeObjectURL(bgPreviewUrl.value)
      bgPreviewUrl.value = url
    }
  }
  function setBgAutoColor(c) { bgAutoColor.value = c }
  function setBgNoiseType(t) { bgNoiseType.value = t }

  function setUndoRedo(u, r) { canUndo.value = u; canRedo.value = r }

  function openExportModal() { exportModalOpen.value = true }
  function closeExportModal() { exportModalOpen.value = false }

  function setCharPosition(x, y) { charX.value = x; charY.value = y }
  function setCharScale(scale) { charScale.value = Math.min(10, Math.max(0.05, scale)) }

  function loadCharImage(img, url = null) {
    charImage.value = img
    if (url) {
      if (charPreviewUrl.value) URL.revokeObjectURL(charPreviewUrl.value)
      charPreviewUrl.value = url
    }
  }
  function loadFrameImage(img, url = null) {
    frameImage.value = img
    if (url) {
      if (framePreviewUrl.value) URL.revokeObjectURL(framePreviewUrl.value)
      framePreviewUrl.value = url
    }
  }
  function removeChar() {
    if (charPreviewUrl.value) URL.revokeObjectURL(charPreviewUrl.value)
    charImage.value = null
    charPreviewUrl.value = null
  }

  function removeFrame() {
    if (framePreviewUrl.value) URL.revokeObjectURL(framePreviewUrl.value)
    frameImage.value = null
    framePreviewUrl.value = null
    frameFileName.value = ''
    maskVersion.value++
  }

  function removeBgImage() {
    if (bgPreviewUrl.value) URL.revokeObjectURL(bgPreviewUrl.value)
    bgImage.value = null
    bgPreviewUrl.value = null
    // Остаёмся в режиме «Картинка», чтобы снова показалась зона загрузки
  }

  // Форсирует пересчёт авто-маски (новая рамка - новое окно)
  function resetMask() {
    maskVersion.value++
  }

  return {
    GRID_CELLS, canvasSize, fullCanvasSize, frameOffset,
    charImage, charX, charY, charScale,
    frameImage, frameFileName, maskVersion,
    charPreviewUrl, framePreviewUrl, bgPreviewUrl,
    overflowY, overflowSoft,
    activeTool, brushSize, brushHardness, brushMode, setBrushMode, lassoMode, setLassoMode,
    charHue, charSaturation, charBrightness, charContrast, charLuminosity,
    charShadowEnabled, charShadowColor, charShadowBlur,
    charShadowOffsetX, charShadowOffsetY, charShadowOpacity,
    resetCharFilters,
    bgType, bgColor, bgImage, setBgType, setBgColor, loadBgImage, removeBgImage,
    bgAutoColor, bgCenterLight, bgEdgeLight, bgNoiseStrength, bgGrain, bgNoiseType,
    setBgAutoColor, setBgNoiseType,
    lights, selectedLightId, hasLights,
    addLight, removeLight, updateLight, selectLight, clearLights,
    showGrid, previewMode, showMaskOverlay, showHidden,
    canUndo, canRedo, setUndoRedo,
    exportModalOpen, openExportModal, closeExportModal,
    hasChar, hasFrame, isReady,
    setActiveTool, toggleGrid, togglePreview, toggleMaskOverlay, toggleHidden,
    setCharPosition, setCharScale,
    loadCharImage, loadFrameImage, resetMask,
    removeChar, removeFrame,
  }
})
