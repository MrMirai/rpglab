import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  // Размер холста
  const canvasSize = ref(500)

  // Персонаж
  const charImage = ref(null)      // HTMLImageElement
  const charX = ref(0)
  const charY = ref(0)
  const charScale = ref(1)

  // Рамка
  const frameImage = ref(null)     // HTMLImageElement
  const frameFileName = ref('')

  // Превью URL (object URLs) — в сторе, чтобы не терялись при размонтировании компонентов
  const charPreviewUrl = ref(null)
  const framePreviewUrl = ref(null)
  const bgPreviewUrl = ref(null)

  // Маска (авто или кастомная)
  const maskImage = ref(null)      // HTMLImageElement
  const useCustomMask = ref(false)
  const maskVersion = ref(0)       // инкремент форсирует пересчёт маски

  // Параметры маски вылезания
  const overflowY = ref(35)        // % от высоты холста
  const overflowSoft = ref(20)     // px, мягкость перехода

  // Активный инструмент
  const activeTool = ref('move')   // 'move' | 'erase' | 'restore'

  // Кисть
  const brushSize = ref(30)
  const brushHardness = ref(50)

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
  const showFrontOnly = ref(false)

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
    if (showMaskOverlay.value) showFrontOnly.value = false
  }
  function toggleFrontOnly() {
    showFrontOnly.value = !showFrontOnly.value
    if (showFrontOnly.value) showMaskOverlay.value = false
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
  function setCharScale(scale) { charScale.value = scale }

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
  function loadMaskImage(htmlImageElement) { maskImage.value = htmlImageElement }

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
    maskImage.value = null
    maskVersion.value++
  }

  function resetMask() {
    maskImage.value = null
    useCustomMask.value = false
    maskVersion.value++
  }

  return {
    canvasSize, charImage, charX, charY, charScale,
    frameImage, frameFileName, maskImage, useCustomMask, maskVersion,
    charPreviewUrl, framePreviewUrl, bgPreviewUrl,
    overflowY, overflowSoft,
    activeTool, brushSize, brushHardness,
    charHue, charSaturation, charBrightness, charContrast, charLuminosity,
    charShadowEnabled, charShadowColor, charShadowBlur,
    charShadowOffsetX, charShadowOffsetY, charShadowOpacity,
    resetCharFilters,
    bgType, bgColor, bgImage, setBgType, setBgColor, loadBgImage,
    bgAutoColor, bgCenterLight, bgEdgeLight, bgNoiseStrength, bgGrain, bgNoiseType,
    setBgAutoColor, setBgNoiseType,
    showGrid, previewMode, showMaskOverlay, showFrontOnly,
    canUndo, canRedo, setUndoRedo,
    exportModalOpen, openExportModal, closeExportModal,
    hasChar, hasFrame, isReady,
    setActiveTool, toggleGrid, togglePreview, toggleMaskOverlay, toggleFrontOnly,
    setCharPosition, setCharScale,
    loadCharImage, loadFrameImage, loadMaskImage, resetMask,
    removeChar, removeFrame,
  }
})
