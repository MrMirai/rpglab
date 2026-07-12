// Мост HandoutCanvas ↔ тулбар/модалка экспорта. Компоненты — сиблинги в разных
// слотах AppLayout (provide/inject не подходит), поэтому синглтон с хендлерами —
// тот же паттерн, что useEditorBridge в редакторе токенов.

const handlers = {
  // Возвращает { stage, uiLayer } Konva для экспорта (uiLayer скрывается на время снимка)
  getStageForExport: null,
  centerView: null,
  // Пересборка кешей эффекта «вписанности» (см. useInkEffect). С аргументом-
  // числом кеширует под этот pixelRatio (экспорт), без — под экранный зум.
  syncInkCaches: null,
}

export function useHandoutBridge() {
  function setHandlers(h) {
    Object.assign(handlers, h)
  }

  function getStageForExport() {
    return handlers.getStageForExport?.() ?? null
  }

  function centerView() {
    handlers.centerView?.()
  }

  function syncInkCaches(ratio = null) {
    handlers.syncInkCaches?.(ratio)
  }

  return { setHandlers, getStageForExport, centerView, syncInkCaches }
}
