import { ref } from 'vue'

// Smart Guides (умные направляющие, как в Figma): математика примагничивания
// при drag/resize + реактивный стейт линий для отрисовки в uiLayer.
// Konva сюда не импортируется — канва передаёт готовые bbox'ы (док-координаты,
// axis-aligned) через getBBox, а полученные поправки применяет к узлам сама.

export const GUIDE_COLOR = '#f24822' // красный Figma
export const SNAP_SCREEN_THRESHOLD = 5 // px ЭКРАНА; в док-px = 5 / viewZoom
const MATCH_EPS = 0.5 // допуск «стоп совпал» при сборе линий ПОСЛЕ снэпа

function emptyGuides() {
  return { v: [], h: [], spacing: [], labels: [] }
}

// Таргеты снэпа: все стопы видимых не-исключённых элементов + документа.
// Стоп = координата края/центра с экстентом перпендикулярной стороны
// (экстент нужен, чтобы линия охватывала и таргет, и снэпнутый элемент).
export function buildTargets(elements, excludeIds, doc, getBBox) {
  const v = []
  const h = []
  const boxes = []
  const pushBox = (b, source) => {
    const y1 = b.y
    const y2 = b.y + b.height
    const x1 = b.x
    const x2 = b.x + b.width
    v.push({ value: b.x, y1, y2, source })
    v.push({ value: b.x + b.width / 2, y1, y2, source })
    v.push({ value: b.x + b.width, y1, y2, source })
    h.push({ value: b.y, x1, x2, source })
    h.push({ value: b.y + b.height / 2, x1, x2, source })
    h.push({ value: b.y + b.height, x1, x2, source })
  }
  pushBox({ x: 0, y: 0, width: doc.width, height: doc.height }, 'doc')
  for (const el of elements) {
    if (excludeIds.has(el.id) || !el.visible) continue
    const b = getBBox(el)
    boxes.push(b)
    pushBox(b, 'el')
  }
  v.sort((a, b) => a.value - b.value)
  h.sort((a, b) => a.value - b.value)
  return { v, h, boxes }
}

// Лучшее выравнивание: минимальная дистанция |стоп − свой стоп| в пределах порога.
export function bestAlignSnap(stops, ownValues, threshold) {
  let best = null
  for (const t of stops) {
    for (const own of ownValues) {
      const dist = Math.abs(t.value - own)
      if (dist > threshold) continue
      if (!best || dist < best.dist) best = { delta: t.value - own, dist }
    }
  }
  return best
}

// Бокс в координатах оси: lo/hi — по главной оси, plo/phi — по перпендикулярной.
function axisBox(b, axis) {
  return axis === 'x'
    ? { lo: b.x, hi: b.x + b.width, plo: b.y, phi: b.y + b.height }
    : { lo: b.y, hi: b.y + b.height, plo: b.x, phi: b.x + b.width }
}

// Равные промежутки: для каждой смежной пары соседей (перекрывающихся с
// перетаскиваемым по перпендикулярной оси) — три кандидата: продолжить ряд
// справа/снизу, слева/сверху, встать посередине между парой. Не Figma-полнота,
// но покрывает главный кейс «три в ряд». segments — промежутки, которые станут
// равными ПОСЛЕ снэпа (в координатах кандидата).
export function bestSpacingSnap(boxes, draggedBox, axis, threshold) {
  const d = axisBox(draggedBox, axis)
  const size = d.hi - d.lo
  const nbs = boxes
    .map((b) => axisBox(b, axis))
    .filter((b) => b.plo < d.phi && b.phi > d.plo)
    .sort((a, b) => a.lo - b.lo)

  let best = null
  const consider = (lo, gap, segments) => {
    const dist = Math.abs(lo - d.lo)
    if (dist > threshold) return
    if (!best || dist < best.dist) best = { delta: lo - d.lo, dist, gap, segments }
  }

  for (let i = 0; i < nbs.length - 1; i++) {
    const A = nbs[i]
    const B = nbs[i + 1]
    const gap = B.lo - A.hi
    if (gap <= 0) continue // пересекаются — промежутка нет
    // продолжить ряд справа/снизу: dragged.lo = B.hi + gap
    consider(B.hi + gap, gap, [
      { from: A.hi, to: B.lo },
      { from: B.hi, to: B.hi + gap },
    ])
    // продолжить ряд слева/сверху: dragged.hi = A.lo − gap
    consider(A.lo - gap - size, gap, [
      { from: A.lo - gap, to: A.lo },
      { from: A.hi, to: B.lo },
    ])
    // встать посередине между A и B (если влезает)
    if (gap > size) {
      const g = (gap - size) / 2
      if (g > 0.5)
        consider(A.hi + g, g, [
          { from: A.hi, to: A.hi + g },
          { from: A.hi + g + size, to: B.lo },
        ])
    }
  }
  return best
}

export function useSmartGuides() {
  const guides = ref(emptyGuides())
  let session = null // { targets, doc } — живёт один drag/transform-жест

  function beginSession({ elements, excludeIds, doc, getBBox }) {
    session = { targets: buildTargets(elements, excludeIds, doc, getBBox), doc }
  }

  function endSession() {
    session = null
    clearGuides()
  }

  function clearGuides() {
    const g = guides.value
    if (!g.v.length && !g.h.length && !g.spacing.length && !g.labels.length) return
    guides.value = emptyGuides()
  }

  // Линии выравнивания строятся от УЖЕ сдвинутого бокса: показываем все стопы,
  // с которыми он фактически совпал (в т.ч. попутные совпадения при снэпе по
  // другой оси). Дедуп по значению с объединением экстентов. Подпись — ОДНА на
  // линию: px до БЛИЖАЙШЕГО непересекающегося вдоль линии элемента-таргета
  // (метки до всех совпавших соседей разом — «400» и «100» на одной линии —
  // только шумят, проверено визуально).
  function collectAlignGuides(box, g) {
    const { targets, doc } = session

    const ownV = [box.x, box.x + box.width / 2, box.x + box.width]
    const vMap = new Map()
    for (const t of targets.v) {
      if (!ownV.some((s) => Math.abs(t.value - s) <= MATCH_EPS)) continue
      const y1 = t.source === 'doc' ? 0 : Math.min(t.y1, box.y)
      const y2 = t.source === 'doc' ? doc.height : Math.max(t.y2, box.y + box.height)
      const key = Math.round(t.value * 2)
      let line = vMap.get(key)
      if (line) {
        line.y1 = Math.min(line.y1, y1)
        line.y2 = Math.max(line.y2, y2)
      } else {
        line = { x: t.value, y1, y2, label: null }
        vMap.set(key, line)
      }
      if (t.source === 'el') {
        let gap = null
        let mid = null
        if (t.y2 < box.y) {
          gap = box.y - t.y2
          mid = (t.y2 + box.y) / 2
        } else if (t.y1 > box.y + box.height) {
          gap = t.y1 - (box.y + box.height)
          mid = (box.y + box.height + t.y1) / 2
        }
        if (gap > 0.5 && (!line.label || gap < line.label.gap)) line.label = { x: t.value, y: mid, gap }
      }
    }
    for (const line of vMap.values()) {
      if (line.label) g.labels.push({ x: line.label.x, y: line.label.y, text: String(Math.round(line.label.gap)) })
      delete line.label
      g.v.push(line)
    }

    const ownH = [box.y, box.y + box.height / 2, box.y + box.height]
    const hMap = new Map()
    for (const t of targets.h) {
      if (!ownH.some((s) => Math.abs(t.value - s) <= MATCH_EPS)) continue
      const x1 = t.source === 'doc' ? 0 : Math.min(t.x1, box.x)
      const x2 = t.source === 'doc' ? doc.width : Math.max(t.x2, box.x + box.width)
      const key = Math.round(t.value * 2)
      let line = hMap.get(key)
      if (line) {
        line.x1 = Math.min(line.x1, x1)
        line.x2 = Math.max(line.x2, x2)
      } else {
        line = { y: t.value, x1, x2, label: null }
        hMap.set(key, line)
      }
      if (t.source === 'el') {
        let gap = null
        let mid = null
        if (t.x2 < box.x) {
          gap = box.x - t.x2
          mid = (t.x2 + box.x) / 2
        } else if (t.x1 > box.x + box.width) {
          gap = t.x1 - (box.x + box.width)
          mid = (box.x + box.width + t.x1) / 2
        }
        if (gap > 0.5 && (!line.label || gap < line.label.gap)) line.label = { x: mid, y: t.value, gap }
      }
    }
    for (const line of hMap.values()) {
      if (line.label) g.labels.push({ x: line.label.x, y: line.label.y, text: String(Math.round(line.label.gap)) })
      delete line.label
      g.h.push(line)
    }
  }

  // Снэп при перетаскивании: box = union-bbox выделения. Возвращает поправку
  // { dx, dy }, побочно заполняет guides. Оси независимы; на каждой соревнуются
  // выравнивание и равные промежутки — меньшая дистанция побеждает, при
  // равенстве приоритет у выравнивания.
  function snapDrag(box, threshold) {
    if (!session) return { dx: 0, dy: 0 }
    const { targets } = session

    const ownV = [box.x, box.x + box.width / 2, box.x + box.width]
    const alignX = bestAlignSnap(targets.v, ownV, threshold)
    const spaceX = bestSpacingSnap(targets.boxes, box, 'x', threshold)
    let dx = 0
    let spacingX = null
    if (alignX && (!spaceX || alignX.dist <= spaceX.dist)) dx = alignX.delta
    else if (spaceX) {
      dx = spaceX.delta
      spacingX = spaceX
    }

    const ownH = [box.y, box.y + box.height / 2, box.y + box.height]
    const alignY = bestAlignSnap(targets.h, ownH, threshold)
    const spaceY = bestSpacingSnap(targets.boxes, box, 'y', threshold)
    let dy = 0
    let spacingY = null
    if (alignY && (!spaceY || alignY.dist <= spaceY.dist)) dy = alignY.delta
    else if (spaceY) {
      dy = spaceY.delta
      spacingY = spaceY
    }

    const shifted = { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height }
    const g = emptyGuides()
    collectAlignGuides(shifted, g)
    if (spacingX) {
      const at = shifted.y + shifted.height / 2
      g.spacing.push({ axis: 'x', at, segments: spacingX.segments })
      for (const seg of spacingX.segments)
        g.labels.push({ x: (seg.from + seg.to) / 2, y: at, text: String(Math.round(spacingX.gap)) })
    }
    if (spacingY) {
      const at = shifted.x + shifted.width / 2
      g.spacing.push({ axis: 'y', at, segments: spacingY.segments })
      for (const seg of spacingY.segments)
        g.labels.push({ x: at, y: (seg.from + seg.to) / 2, text: String(Math.round(spacingY.gap)) })
    }
    guides.value = g
    return { dx, dy }
  }

  // Ближайший стоп к значению в пределах порога
  function bestStop(stops, value, threshold) {
    let best = null
    for (const t of stops) {
      const dist = Math.abs(t.value - value)
      if (dist > threshold) continue
      if (!best || dist < best.dist) best = { stop: t, dist }
    }
    return best?.stop ?? null
  }

  // Снэп при ресайзе: двигаем ТОЛЬКО движущиеся кромки (edges — Set из
  // 'left'/'right'/'top'/'bottom' по активной ручке трансформера).
  // Spacing/подписи на ресайзе не делаем — только линии совпадения.
  function snapResizeEdges(box, edges, threshold) {
    if (!session) return box
    const { targets, doc } = session
    const out = { ...box }
    const g = emptyGuides()

    const vGuide = (t) => ({
      x: t.value,
      y1: t.source === 'doc' ? 0 : Math.min(t.y1, out.y),
      y2: t.source === 'doc' ? doc.height : Math.max(t.y2, out.y + out.height),
    })
    const hGuide = (t) => ({
      y: t.value,
      x1: t.source === 'doc' ? 0 : Math.min(t.x1, out.x),
      x2: t.source === 'doc' ? doc.width : Math.max(t.x2, out.x + out.width),
    })

    if (edges.has('left')) {
      const t = bestStop(targets.v, out.x, threshold)
      if (t) {
        out.width += out.x - t.value
        out.x = t.value
        g.v.push(vGuide(t))
      }
    }
    if (edges.has('right')) {
      const t = bestStop(targets.v, out.x + out.width, threshold)
      if (t) {
        out.width = t.value - out.x
        g.v.push(vGuide(t))
      }
    }
    if (edges.has('top')) {
      const t = bestStop(targets.h, out.y, threshold)
      if (t) {
        out.height += out.y - t.value
        out.y = t.value
        g.h.push(hGuide(t))
      }
    }
    if (edges.has('bottom')) {
      const t = bestStop(targets.h, out.y + out.height, threshold)
      if (t) {
        out.height = t.value - out.y
        g.h.push(hGuide(t))
      }
    }

    if (g.v.length || g.h.length) guides.value = g
    else clearGuides()
    return out
  }

  return { guides, beginSession, endSession, clearGuides, snapDrag, snapResizeEdges }
}
