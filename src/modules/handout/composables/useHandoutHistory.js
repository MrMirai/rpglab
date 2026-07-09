import { ref } from 'vue'

// Undo/redo для редактора раздаток. В отличие от редактора токенов снапшот —
// чистый JSON ({ elements, document }), поэтому дёшев и не требует canvas-копий.
// Синглтон на модуль: тулбар, канва и панели работают с одним стеком.

const MAX_HISTORY = 50

const undoStack = []
const redoStack = []
const canUndo = ref(false)
const canRedo = ref(false)

// Коалесинг: серия однотипных изменений (drag слайдера, ввод в поле)
// пишется в историю одним шагом — record с тем же ключом в течение
// COALESCE_MS не создаёт новый снапшот.
const COALESCE_MS = 800
let lastKey = null
let lastTime = 0

function snapshot(store) {
  return JSON.parse(
    JSON.stringify({ document: store.document, elements: store.elements }),
  )
}

function sync() {
  canUndo.value = undoStack.length > 0
  canRedo.value = redoStack.length > 0
}

export function useHandoutHistory() {
  // Записать состояние ДО изменения. key — идентификатор операции для коалесинга.
  function record(store, key = null) {
    const now = performance.now()
    if (key && key === lastKey && now - lastTime < COALESCE_MS) {
      lastTime = now
      return
    }
    lastKey = key
    lastTime = now

    undoStack.push(snapshot(store))
    if (undoStack.length > MAX_HISTORY) undoStack.shift()
    redoStack.length = 0
    sync()
  }

  function undo(store) {
    if (!undoStack.length) return
    redoStack.push(snapshot(store))
    store.replaceDocument(undoStack.pop())
    lastKey = null
    sync()
  }

  function redo(store) {
    if (!redoStack.length) return
    undoStack.push(snapshot(store))
    store.replaceDocument(redoStack.pop())
    lastKey = null
    sync()
  }

  function clear() {
    undoStack.length = 0
    redoStack.length = 0
    lastKey = null
    sync()
  }

  return { record, undo, redo, clear, canUndo, canRedo }
}
