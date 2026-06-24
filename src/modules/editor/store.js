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
  function loadBgImage(img) { bgImage.value = img; bgType.value = img ? 'image' : 'none' }
  function setBgAutoColor(c) { bgAutoColor.value = c }
  function setBgNoiseType(t) { bgNoiseType.value = t }

  function setCharPosition(x, y) { charX.value = x; charY.value = y }
  function setCharScale(scale) { charScale.value = scale }

  function loadCharImage(htmlImageElement) { charImage.value = htmlImageElement }
  function loadFrameImage(htmlImageElement) { frameImage.value = htmlImageElement }
  function loadMaskImage(htmlImageElement) { maskImage.value = htmlImageElement }

  function resetMask() {
    maskImage.value = null
    useCustomMask.value = false
    maskVersion.value++
  }

  return {
    canvasSize, charImage, charX, charY, charScale,
    frameImage, maskImage, useCustomMask, maskVersion,
    overflowY, overflowSoft,
    activeTool, brushSize, brushHardness,
    bgType, bgColor, bgImage, setBgType, setBgColor, loadBgImage,
    bgAutoColor, bgCenterLight, bgEdgeLight, bgNoiseStrength, bgGrain, bgNoiseType,
    setBgAutoColor, setBgNoiseType,
    showGrid, previewMode, showMaskOverlay, showFrontOnly,
    hasChar, hasFrame, isReady,
    setActiveTool, toggleGrid, togglePreview, toggleMaskOverlay, toggleFrontOnly,
    setCharPosition, setCharScale,
    loadCharImage, loadFrameImage, loadMaskImage, resetMask,
  }
})
