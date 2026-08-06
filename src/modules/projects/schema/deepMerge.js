function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Глубокое слияние дефолтов с содержимым проекта: объекты сливаются рекурсивно,
// а массивы и примитивы источник ЗАМЕНЯЕТ целиком (склеивать список элементов
// раздатки с дефолтным пустым бессмысленно, а по индексу - вредно: удалённый
// элемент «воскрес» бы из дефолтов). Незнакомые ключи источника сохраняются -
// их мог положить более новый редактор, и терять их нельзя.
// Общее для схем токена и раздатки.
export function deepMerge(defaults, source) {
  const out = { ...defaults }
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value === undefined) continue
    out[key] =
      isPlainObject(value) && isPlainObject(defaults?.[key])
        ? deepMerge(defaults[key], value)
        : value
  }
  return out
}
