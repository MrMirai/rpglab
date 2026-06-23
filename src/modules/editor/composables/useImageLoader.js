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
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
      img.crossOrigin = 'anonymous'
    })
  }

  return { loadFromFile, loadFromUrl }
}
