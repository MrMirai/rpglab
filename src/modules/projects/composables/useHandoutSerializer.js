import { HANDOUT_SCHEMA_VERSION } from '../schema/handoutProject.js'

// Все картинки раздатки (фоновая текстура документа и изображения-элементы)
// грузятся с одним типом - они одинаково «содержимое раздатки».
const ASSET_TYPE = 'handout_image'

// Возвращает assetId для одной картинки.
// url в раздатке - рантайм-ссылка (обычно blob: на локальный файл), она мертва
// после перезагрузки вкладки, поэтому в содержимое идёт только assetId. Если он
// уже есть (картинка пришла с сервера при открытии проекта), файл НЕ
// перезаливается: содержимое то же, сервер вернул бы по дедупликации тот же id.
// Без uploadAsset ссылка остаётся пустой - встраивать картинку в содержимое
// инлайном нельзя, лимит configuration 1 МиБ.
// pending - общий на одно сохранение кеш «url → обещание заливки». Копия
// элемента (Ctrl+C/Ctrl+V) делит с оригиналом один object URL, и без кеша один
// и тот же файл уехал бы на сервер столько раз, сколько копий на листе. Бэкенд
// дедуплицирует по хешу и вернул бы тот же id, но платить за это трафиком
// незачем.
async function resolveAssetId(url, knownAssetId, uploadAsset, pending) {
  if (!url) return null
  if (knownAssetId) return knownAssetId
  if (!uploadAsset) return null

  if (!pending.has(url)) {
    pending.set(
      url,
      (async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Не удалось прочитать изображение раздатки')
        const asset = await uploadAsset(await res.blob(), ASSET_TYPE)
        return asset?.id ?? null
      })(),
    )
  }
  return pending.get(url)
}

// Собирает configuration проекта раздатки из состояния стора.
//
// baseConfig - содержимое, пришедшее с сервера при открытии проекта: собирать
// его с нуля нельзя, иначе поля чужих версий схемы (бэкенд-то их вернёт)
// потеряются на клиенте. Известные поля накладываются на пришедшую базу.
export async function serializeHandoutProject(
  store,
  { uploadAsset = null, baseConfig = null } = {},
) {
  const base = baseConfig ? JSON.parse(JSON.stringify(baseConfig)) : {}
  const doc = store.document
  const background = doc.background ?? {}
  const pending = new Map()

  // Картинки заливаются параллельно: у раздатки их бывает много, а
  // последовательная очередь растянула бы сохранение на все круги ожидания.
  const [textureAssetId, elements] = await Promise.all([
    resolveAssetId(background.textureUrl, background.textureAssetId, uploadAsset, pending),
    Promise.all(
      store.elements.map(async (element) => {
        // url - рантайм-поле, в сохраняемое содержимое оно не попадает.
        const { url, ...rest } = element
        if (element.type !== 'IMAGE') return rest
        return {
          ...rest,
          assetId: await resolveAssetId(url, element.assetId, uploadAsset, pending),
        }
      }),
    ),
  ])

  return {
    ...base,
    schemaVersion: HANDOUT_SCHEMA_VERSION,

    document: {
      ...base.document,
      width: doc.width,
      height: doc.height,
      sizePreset: doc.sizePreset,
      background: {
        ...base.document?.background,
        type: background.type,
        color: background.color,
        textureAssetId,
      },
    },

    // Список заменяет базу целиком: слить массивы по индексу нельзя - удалённый
    // элемент «воскрес» бы из baseConfig.
    elements,
  }
}
