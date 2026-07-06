// Загружает File или URL в HTMLImageElement
export function useImageLoader() {
  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
      img.onerror = reject
      img.src = url
    })
  }

  function loadFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      // crossOrigin ДО src — иначе не действует; нужен, чтобы холст не «протух»
      // (tainted) и работал экспорт. Ассеты MinIO и data:-URL отдают CORS/безопасны.
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  return { loadFromFile, loadFromUrl }
}
