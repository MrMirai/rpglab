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
    showGrid, previewMode, showMaskOverlay, showFrontOnly,
    hasChar, hasFrame, isReady,
    setActiveTool, toggleGrid, togglePreview, toggleMaskOverlay, toggleFrontOnly,
    setCharPosition, setCharScale,
    loadCharImage, loadFrameImage, loadMaskImage, resetMask,
  }
})
