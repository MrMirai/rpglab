// Логика выделения и трансформера: поиск Konva-узлов по выбранным id
// и обработка кликов по стейджу (выделение / shift-мультивыделение / сброс).

export function useHandoutSelection() {
  // Konva-узлы для трансформера. Заблокированные элементы можно выделить
  // (панель свойств покажет их), но ручки трансформера для них не показываем.
  function getTransformerNodes(selectedIds, stage, elements) {
    if (!stage) return []
    const byId = new Map(elements.map((e) => [e.id, e]))
    const nodes = []
    for (const id of selectedIds) {
      const el = byId.get(id)
      if (!el || el.locked) continue
      const node = stage.findOne('#' + id)
      if (node) nodes.push(node)
    }
    return nodes
  }

  // Поднимается от e.target к предку, чей id — известный элемент
  // (текст внутри label, картинка внутри группы и т.п.)
  function resolveElementId(target, knownIds) {
    let node = target
    while (node) {
      const id = node.id?.()
      if (id && knownIds.has(id)) return id
      node = node.getParent?.()
    }
    return null
  }

  // Клик по стейджу: элемент → выделить (shift — toggle), пусто → сбросить.
  function handleStageClick(e, store) {
    const knownIds = new Set(store.elements.map((el) => el.id))
    const id = resolveElementId(e.target, knownIds)
    if (!id) {
      store.clearSelection()
      return
    }
    if (e.evt?.shiftKey) store.toggleSelected(id)
    else if (!store.selectedIds.includes(id)) store.setSelected([id])
  }

  return { getTransformerNodes, resolveElementId, handleStageClick }
}
