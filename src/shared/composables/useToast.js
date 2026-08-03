// Глобальные всплывающие уведомления (toasts).
//
// Синглтон на уровне модуля (как useEditorBridge): очередь одна на приложение,
// её рисует единственный ToastHost, смонтированный в App.vue. Любой компонент
// или стор просто зовёт useToast().success(...) - знать про хост ему не нужно.
import { ref, readonly } from 'vue'

// Сколько уведомлений держим на экране одновременно: сверх лимита самое старое
// уходит, иначе долгая пачка ошибок закрыла бы пол-экрана.
const MAX_TOASTS = 4

// Время жизни по типам: чем неприятнее сообщение, тем дольше висит.
// 0 - не закрывать автоматически (только по клику на «×»).
const DEFAULT_TIMEOUT = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
}

const toasts = ref([])
let nextId = 1

// Таймеры автозакрытия живут вне реактивного состояния: в toasts должны быть
// только сериализуемые данные для рендера, без handle'ов setTimeout.
const timers = new Map()

function clearTimer(id) {
  const timer = timers.get(id)
  if (timer?.handle) clearTimeout(timer.handle)
  timers.delete(id)
}

function dismiss(id) {
  clearTimer(id)
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function clear() {
  toasts.value.forEach((t) => clearTimer(t.id))
  toasts.value = []
}

// Пауза/возобновление отсчёта - хост зовёт их на наведение мыши, чтобы
// уведомление не исчезло ровно в тот момент, когда его читают. Остаток
// считаем сами (setTimeout не умеет сообщать, сколько ещё осталось).
// Флаг paused живёт в самом уведомлении (а не только в timers): по нему карточка
// останавливает CSS-анимацию полосы прогресса - иначе полоса добежала бы до конца,
// пока таймер стоит на паузе, и обещала бы закрытие, которого не будет.
function setPaused(id, value) {
  const toast = toasts.value.find((t) => t.id === id)
  if (toast) toast.paused = value
}

function pause(id) {
  const timer = timers.get(id)
  if (!timer?.handle) return
  clearTimeout(timer.handle)
  timer.handle = null
  timer.remaining -= Date.now() - timer.startedAt
  setPaused(id, true)
}

function resume(id) {
  const timer = timers.get(id)
  if (!timer || timer.handle) return
  if (timer.remaining <= 0) {
    dismiss(id)
    return
  }
  timer.startedAt = Date.now()
  timer.handle = setTimeout(() => dismiss(id), timer.remaining)
  setPaused(id, false)
}

/**
 * Показать уведомление.
 * @param {'success'|'info'|'warning'|'error'} type
 * @param {string} message - основной текст
 * @param {{ title?: string, timeout?: number }} [options] - timeout: 0 = висит до закрытия
 * @returns {number} id - им можно закрыть уведомление вручную (dismiss)
 */
function notify(type, message, options = {}) {
  const id = nextId++
  const timeout = options.timeout ?? DEFAULT_TIMEOUT[type] ?? DEFAULT_TIMEOUT.info
  const toast = {
    id,
    type,
    message,
    title: options.title || '',
    // duration/paused нужны карточке для полосы прогресса: она отсчитывает
    // ровно то же время, что и таймер автозакрытия (0 - полоса статична).
    duration: timeout,
    paused: false,
  }

  toasts.value = [...toasts.value, toast]

  // Переполнение гасим по одному с головы очереди (самые старые)
  while (toasts.value.length > MAX_TOASTS) {
    dismiss(toasts.value[0].id)
  }

  if (timeout > 0) {
    timers.set(id, { handle: null, remaining: timeout, startedAt: 0 })
    resume(id)
  }

  return id
}

const toast = {
  toasts: readonly(toasts),
  notify,
  success: (message, options) => notify('success', message, options),
  info: (message, options) => notify('info', message, options),
  warning: (message, options) => notify('warning', message, options),
  error: (message, options) => notify('error', message, options),
  dismiss,
  clear,
  pause,
  resume,
}

export function useToast() {
  return toast
}
