// Вспомогательные чистые функции для элементов раздатки:
// генерация id, дефолты по типу, позиционирование в центре видимой области.

export function generateId() {
  // crypto.randomUUID доступен в secure context (localhost — ок)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Фолбэк на случай http-окружения
  return 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

// Базовые поля, общие для всех элементов.
// flipX/flipY — зеркальное отражение (Konva реализуем через scale + offset).
// blendMode — режим наложения (globalCompositeOperation), доступен всем типам.
// inkStrength — «вписанность» в бумагу 0..100 (см. useInkEffect): multiply +
// зерно бумаги выедает краску + растекание краёв. У старых/загруженных
// элементов поля может не быть — читать через `?? 0`.
function baseDefaults() {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    flipX: false,
    flipY: false,
    blendMode: 'normal', // см. BLEND_MODES
    inkStrength: 0,
  }
}

// Дефолтные свойства нового элемента по типу.
// width/height здесь — стартовые размеры при добавлении на холст.
export function getElementDefaults(type) {
  switch (type) {
    case 'TEXT':
      return {
        ...baseDefaults(),
        type: 'TEXT',
        width: 300,
        height: 60,
        content: 'Введите текст',
        fontFamily: 'Georgia',
        fontSize: 24,
        fontStyle: 'normal', // normal | italic | bold | bold italic
        textDecoration: 'none', // none | underline
        align: 'left', // left | center | right | justify
        color: '#2b2320',
        lineHeight: 1.2,
        letterSpacing: 0,
        backgroundColor: null, // null = без фона
        padding: 8,
      }
    case 'IMAGE':
      return {
        ...baseDefaults(),
        type: 'IMAGE',
        width: 300,
        height: 200,
        url: null,
        assetId: null,
        fit: 'cover', // contain | cover | fill
        cornerRadius: 0,
        // Цветовая коррекция (CSS-фильтры при отрисовке, как у персонажа в токенах)
        hue: 0, // -180..180
        saturation: 100, // 0..200 %
        brightness: 100, // 0..200 %
        contrast: 100, // 0..200 %
      }
    case 'SHAPE':
      return {
        ...baseDefaults(),
        type: 'SHAPE',
        width: 200,
        height: 140,
        shapeType: 'rect', // rect | ellipse
        fill: '#c4954a',
        stroke: '#2b2320',
        strokeWidth: 0,
        cornerRadius: 0,
      }
    default:
      throw new Error(`Unknown element type: ${type}`)
  }
}

// Координаты (x, y) элемента w×h, центрированного в видимой области холста.
// viewState: { x, y, zoom, w, h } — pan/zoom вьюпорта и размеры контейнера.
// Если вьюпорт ещё не измерен — центрируем относительно документа.
export function centerInViewport(w, h, viewState, doc) {
  if (viewState && viewState.w > 0 && viewState.h > 0 && viewState.zoom > 0) {
    const cx = (viewState.w / 2 - viewState.x) / viewState.zoom
    const cy = (viewState.h / 2 - viewState.y) / viewState.zoom
    return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) }
  }
  return { x: Math.round(doc.width / 2 - w / 2), y: Math.round(doc.height / 2 - h / 2) }
}
