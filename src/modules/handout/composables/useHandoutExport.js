// Экспорт раздатки: PNG/WebP через Konva stage.toDataURL, PDF через jspdf.
// Документ задан в px при 96dpi, поэтому pixelRatio = dpi / 96.

const BASE_DPI = 96

// Самохостed шрифты (Caveat/Marck Script/Neucha/PT Mono/Cousine/Overpass Mono,
// см. shared/assets/styles/_fonts.scss) грузятся браузером ЛЕНИВО — только когда
// какой-то узел реально запрашивает их. К моменту экспорта файл может быть ещё
// не догружен, и toDataURL синхронно нарисует текст фолбэк-шрифтом БЕЗ ошибки
// (в отличие от <img>, canvas не ждёт шрифт сам). document.fonts.ready ждёт
// только уже запрошенные шрифты — на случай, если элемент с кастомным шрифтом
// ещё ни разу не отрисовывался (сразу после смены fontFamily), явно просим
// браузер загрузить его перед экспортом через document.fonts.load.
async function ensureFontsLoaded(elements) {
  if (!document.fonts) return
  const families = new Set(elements.filter((e) => e.type === 'TEXT').map((e) => e.fontFamily))
  await Promise.all(
    [...families].map((f) => document.fonts.load(`16px "${f}"`).catch(() => {})),
  )
  await document.fonts.ready
}

export function useHandoutExport() {
  // Снимок области документа (0,0..w,h) без ui-слоя и без текущего pan/zoom:
  // временно сбрасываем трансформ стейджа, делаем toDataURL, возвращаем всё назад.
  function captureDataUrl(stage, uiLayer, doc, dpi, mimeType) {
    const prev = {
      x: stage.x(),
      y: stage.y(),
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
    }
    const uiWasVisible = uiLayer ? uiLayer.visible() : false
    if (uiLayer) uiLayer.visible(false)
    stage.position({ x: 0, y: 0 })
    stage.scale({ x: 1, y: 1 })

    try {
      return stage.toDataURL({
        x: 0,
        y: 0,
        width: doc.width,
        height: doc.height,
        pixelRatio: dpi / BASE_DPI,
        mimeType,
      })
    } finally {
      stage.position({ x: prev.x, y: prev.y })
      stage.scale({ x: prev.scaleX, y: prev.scaleY })
      if (uiLayer) uiLayer.visible(uiWasVisible)
      stage.batchDraw()
    }
  }

  function download(dataUrl, filename) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  async function exportPng(stage, uiLayer, doc, dpi, filename = 'handout', elements = []) {
    await ensureFontsLoaded(elements)
    const url = captureDataUrl(stage, uiLayer, doc, dpi, 'image/png')
    download(url, `${filename}.png`)
  }

  async function exportWebp(stage, uiLayer, doc, dpi, filename = 'handout', elements = []) {
    await ensureFontsLoaded(elements)
    const url = captureDataUrl(stage, uiLayer, doc, dpi, 'image/webp')
    download(url, `${filename}.webp`)
  }

  // PDF: PNG-снимок вставляется картинкой в страницу физического размера
  // документа (мм из px при 96dpi). jspdf грузим лениво — он нужен редко.
  async function exportPdf(stage, uiLayer, doc, dpi, filename = 'handout', elements = []) {
    await ensureFontsLoaded(elements)
    const { jsPDF } = await import('jspdf')
    const mmW = (doc.width / BASE_DPI) * 25.4
    const mmH = (doc.height / BASE_DPI) * 25.4
    const dataUrl = captureDataUrl(stage, uiLayer, doc, dpi, 'image/png')

    const pdf = new jsPDF({
      orientation: mmW > mmH ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [mmW, mmH],
    })
    pdf.addImage(dataUrl, 'PNG', 0, 0, mmW, mmH)
    pdf.save(`${filename}.pdf`)
  }

  return { exportPng, exportWebp, exportPdf }
}
