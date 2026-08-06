import { useEditorStore, useExport, useBrushMask } from '@/modules/editor'
import { useHandoutStore, useHandoutExport } from '@/modules/handout'

// Превью проекта - уменьшенная копия готового токена для карточки в списке.
// Хранится ОТДЕЛЬНЫМ полем проекта (previewAssetId), а не внутри configuration:
// список проектов не должен разбирать содержимое, чтобы показать миниатюру.
const PREVIEW_SIZE = 256
// Рендерим крупнее итогового размера: после обрезки пустых полей картинка
// уменьшается, и снимать сразу в 256 значило бы потом растягивать обрезок.
const RENDER_SIZE = 512
// WebP, а не PNG: миниатюру ужимает вчетверо, а карточка всё равно рисует её
// в ~88px. Тип содержимого бэкенду безразличен - он хранит байты как есть.
const PREVIEW_MIME = 'image/webp'
const PREVIEW_QUALITY = 0.8

// Границы непрозрачного содержимого. exportToken отдаёт КВАДРАТ, сторона
// которого кратна размеру клетки рамки (степень двойки), - персонажу, вылезающему
// за рамку хоть на пиксель, отводится вдвое больший холст. В превью это давало
// широкие прозрачные поля, и токен в карточке выглядел крошечным.
function findContentBounds(canvas) {
  const { width, height } = canvas
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height)

  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Смотрим только альфу: цвет непрозрачного пикселя роли не играет.
      if (data[(y * width + x) * 4 + 3] === 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  // Пустой холст (снимать нечего) - вернём null, обрезку пропустим.
  if (right < left || bottom < top) return null
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

// Обрезает прозрачные поля и вписывает содержимое в квадрат PREVIEW_SIZE.
// Квадрат, а не «как получилось»: карточки в списке должны быть одного размера,
// иначе сетка едет. Пропорции токена сохраняются, лишнее по короткой стороне
// остаётся прозрачным - карточка сама решит, как это показать.
function trimToContent(canvas) {
  const bounds = findContentBounds(canvas)
  if (!bounds) return canvas

  const out = document.createElement('canvas')
  out.width = PREVIEW_SIZE
  out.height = PREVIEW_SIZE

  // Не увеличиваем: если содержимого меньше целевого размера, растягивание
  // только добавит мыла - рисуем как есть, по центру.
  const scale = Math.min(PREVIEW_SIZE / bounds.width, PREVIEW_SIZE / bounds.height, 1)
  const drawW = Math.round(bounds.width * scale)
  const drawH = Math.round(bounds.height * scale)

  out.getContext('2d').drawImage(
    canvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    Math.round((PREVIEW_SIZE - drawW) / 2),
    Math.round((PREVIEW_SIZE - drawH) / 2),
    drawW,
    drawH,
  )
  return out
}

export function useProjectPreview() {
  // Возвращает Blob превью или null, если снимать нечего.
  async function buildTokenPreview() {
    const store = useEditorStore()
    // exportToken читает store.charImage без проверок (рамка без персонажа -
    // не токен), поэтому неполную работу даже не пытаемся снимать.
    if (!store.isReady) return null

    const { exportToken } = useExport()
    const { brushCanvas, brushVersion } = useBrushMask()

    const rendered = await exportToken(store, brushCanvas, {
      mode: 'full',
      size: RENDER_SIZE,
      brushVersion: brushVersion.value,
    })

    return new Promise((resolve) =>
      trimToContent(rendered).toBlob(resolve, PREVIEW_MIME, PREVIEW_QUALITY),
    )
  }

  // Превью раздатки - уменьшенный лист целиком, БЕЗ обрезки по содержимому:
  // у раздатки содержимое и есть страница, и пропорции листа (A4, свиток,
  // карточка) сами по себе узнаваемы - обрезка только ломала бы узнавание.
  // Шага обрезки нет, поэтому RENDER_SIZE тут сразу итоговая длинная сторона.
  function buildHandoutPreview() {
    const store = useHandoutStore()
    const { capturePreviewBlob } = useHandoutExport()
    return capturePreviewBlob(store.document, store.elements, RENDER_SIZE)
  }

  return { buildTokenPreview, buildHandoutPreview }
}
