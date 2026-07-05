export const SCHEMA_VERSION = 1

// ImageRef — единый тип для любого растра в проекте (персонаж/рамка/фон/маска/кисть).
// source: 'inline' — dataUrl хранится прямо в JSON (черновик без сохранения на сервер);
// source: 'remote' — key/url ссылаются на ассет в MinIO (сохранённый проект). key —
// непрозрачный assetId, выданный сервером при загрузке (дедупликация по SHA-256
// содержимого) — клиент не конструирует и не предполагает его формат;
// null — изображения нет.
export function createEmptyImageRef() {
  return null
}

export function createEmptyProject() {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,

    id: crypto.randomUUID(),
    name: 'Без названия',
    createdAt: now,
    updatedAt: now,

    canvas: {
      size: 500,
    },

    character: {
      image: null,
      x: 0,
      y: 0,
      scale: 1,

      filters: {
        hue: 0,
        saturation: 100,
        brightness: 100,
        contrast: 100,
        luminosity: 0,
      },

      shadow: {
        enabled: false,
        color: '#000000',
        blur: 20,
        offsetX: 0,
        offsetY: 8,
        opacity: 60,
      },
    },

    frame: {
      image: null,
      fileName: '',
    },

    mask: {
      useCustomMask: false,
      customImage: null,
      overflow: {
        y: 35,
        soft: 20,
      },
      brush: null,
    },

    background: {
      type: 'none',
      color: '#1a1a2e',
      image: null,

      auto: {
        baseColor: '#28283c',
        centerLight: 0.7,
        edgeLight: 1.3,
        noiseStrength: 15,
        grain: 6,
        noiseType: 'perlin',
        generatedImage: null,
      },
    },

    toolPrefs: {
      brushSize: 30,
      brushHardness: 50,
      brushMode: 'restore',
      lassoMode: 'add',
    },
  }
}
