// Прогон миграций содержимого проекта до целевой версии схемы. Общий для
// токенов и раздаток: у каждого редактора свой формат и своя таблица миграций,
// но правила подъёма одинаковые.
//
// migrations - { версия_из: (содержимое) => содержимое версией выше }.
// Бэкенд про версии не знает и ничего не переписывает, поэтому поднимать старый
// проект до актуального формата обязан клиент.
export function runMigrations(config, migrations, targetVersion) {
  let current = config ?? {}

  while (typeof current.schemaVersion === 'number' && current.schemaVersion < targetVersion) {
    const step = migrations[current.schemaVersion]
    // Шага для версии нет - дальше не поднимаемся: дефолты наложит applyDefaults,
    // а молчаливое зацикливание тут хуже неполной миграции.
    if (!step) break
    const next = step(current)
    // Страховка от шага, который забыл поднять версию: без неё цикл вечный.
    if (!(next.schemaVersion > current.schemaVersion)) break
    current = next
  }

  return current
}
