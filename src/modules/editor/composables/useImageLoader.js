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

  // Грузит удалённый ассет через fetch → blob → локальный object URL, и уже
  // из него — HTMLImageElement. Отличие от loadFromUrl в том, что возвращается
  // СТАБИЛЬНЫЙ objectUrl: presigned-ссылки MinIO живут 15 мин, поэтому их
  // нельзя использовать как долгоживущий src превью (<img>) — через 15 минут
  // ссылка протухает и картинка ломается. objectUrl живёт, пока жива вкладка
  // (владелец обязан revoke при замене/удалении).
  async function loadFromUrlAsBlob(url) {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`Не удалось загрузить ассет (${res.status})`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      const img = await loadFromUrl(objectUrl)
      return { img, objectUrl }
    } catch (e) {
      URL.revokeObjectURL(objectUrl)
      throw e
    }
  }

  return { loadFromFile, loadFromUrl, loadFromUrlAsBlob }
}
