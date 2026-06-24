// Стеки undo/redo. Чистая логика, без DOM — снимки готовит вызывающий код.

export function useHistory() {
  const past = []      // стек прошлых состояний
  const future = []    // стек будущих состояний (для redo)
  const MAX = 50       // максимум шагов

  function push(snapshot) {
    past.push(snapshot)
    if (past.length > MAX) past.shift()
    // При новом действии очищаем future
    future.length = 0
  }

  function undo(current) {
    if (past.length === 0) return null
    future.push(current)
    return past.pop()
  }

  function redo(current) {
    if (future.length === 0) return null
    past.push(current)
    return future.pop()
  }

  const canUndo = () => past.length > 0
  const canRedo = () => future.length > 0

  return { push, undo, redo, canUndo, canRedo }
}
