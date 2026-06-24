// Singleton-мост между EditorCanvas и компонентами-сиблингами (AppHeader,
// MaskControls). Они не предок/потомок EditorCanvas, поэтому provide/inject
// не работает — EditorCanvas регистрирует обработчики через setHandlers().

const handlers = {
  performUndo: null,
  performRedo: null,
  recordHistory: null,
  centerView: null,
}

export function useEditorBridge() {
  function setHandlers(h) { Object.assign(handlers, h) }

  function performUndo() { handlers.performUndo?.() }
  function performRedo() { handlers.performRedo?.() }
  function recordHistory() { handlers.recordHistory?.() }
  function centerView() { handlers.centerView?.() }

  return { setHandlers, performUndo, performRedo, recordHistory, centerView }
}
