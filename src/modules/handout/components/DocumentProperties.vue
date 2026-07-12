<script setup>
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import ColorButton from '@/shared/components/ColorButton.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import SelectField from '@/shared/components/SelectField.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'
import { useHandoutStore, SIZE_PRESETS } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import NumberField from './NumberField.vue'

// Свойства документа (показываются, когда ничего не выбрано):
// размер (пресет/произвольный) и фон (none/color/texture).
const store = useHandoutStore()
const history = useHandoutHistory()

const sections = ref({ size: true, background: true })

const presetOptions = computed(() =>
  SIZE_PRESETS.map((p) => ({
    value: p.id,
    label: `${p.label}${p.width ? ` — ${p.width}×${p.height}` : ''}`,
  })),
)

function onPresetChange(id) {
  const preset = SIZE_PRESETS.find((p) => p.id === id)
  if (!preset) return
  history.record(store)
  if (preset.id === 'custom') {
    store.setDocument({ sizePreset: 'custom' })
  } else {
    store.setDocument({ sizePreset: preset.id, width: preset.width, height: preset.height })
  }
}

function setCustomSize(key, val) {
  history.record(store, 'doc-size')
  store.setDocument({ sizePreset: 'custom', [key]: Math.max(50, Math.min(4000, val)) })
}

function setBgType(type) {
  history.record(store)
  store.setBackground({ type })
}

// Размер документа подгоняется под натуральный пиксельный размер загруженной
// картинки — иначе текстура растягивается/обрезается под текущий (обычно
// A4) размер, что почти всегда не то, что нужно. Ждём decode картинки, чтобы
// узнать naturalWidth/Height (Image.onload может сработать до полного decode
// в некоторых браузерах — img.decode() надёжнее). Тот же clamp [50,4000], что
// и у ручного ввода размера (setCustomSize) — не даём документу выйти за
// разумные пределы холста/экспорта.
async function onTextureFile(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  try {
    await img.decode()
  } catch {
    // decode() может упасть на битом файле — грузим текстуру как есть,
    // без автоподгона размера, чем ломать загрузку целиком
  }
  history.record(store)
  const patch = { type: 'texture', textureUrl: url }
  if (img.naturalWidth && img.naturalHeight) {
    store.setDocument({
      sizePreset: 'custom',
      width: Math.max(50, Math.min(4000, img.naturalWidth)),
      height: Math.max(50, Math.min(4000, img.naturalHeight)),
    })
  }
  store.setBackground(patch)
}

function removeTexture() {
  history.record(store)
  store.setBackground({ textureUrl: null })
}
</script>

<template>
  <div class="doc-props">
    <CollapsibleSection v-model:open="sections.size" label="Размер документа">
      <div class="section-body">
        <SelectField
          :model-value="store.document.sizePreset"
          :options="presetOptions"
          @update:model-value="onPresetChange"
        />

        <div class="fields-row">
          <NumberField
            label="W"
            :model-value="store.document.width"
            :min="50" :max="4000"
            @update:model-value="setCustomSize('width', $event)"
          />
          <NumberField
            label="H"
            :model-value="store.document.height"
            :min="50" :max="4000"
            @update:model-value="setCustomSize('height', $event)"
          />
        </div>
      </div>
    </CollapsibleSection>

    <CollapsibleSection v-model:open="sections.background" label="Фон">
      <div class="section-body">
        <div class="bg-types">
          <BaseButton size="sm" full-width :active="store.document.background.type === 'none'" @click="setBgType('none')">
            Нет
          </BaseButton>
          <BaseButton size="sm" full-width :active="store.document.background.type === 'color'" @click="setBgType('color')">
            Цвет
          </BaseButton>
          <BaseButton size="sm" full-width :active="store.document.background.type === 'texture'" @click="setBgType('texture')">
            Текстура
          </BaseButton>
        </div>

        <div v-if="store.document.background.type === 'color'" class="bg-color">
          <ColorButton
            :model-value="store.document.background.color"
            @update:model-value="history.record(store, 'doc-bg-color'); store.setBackground({ color: $event })"
          />
        </div>

        <div v-else-if="store.document.background.type === 'texture'" class="bg-texture">
          <ImageDropzone
            :filled="!!store.document.background.textureUrl"
            accept="image/*"
            label="Загрузить текстуру"
            hint="PNG, JPG, WebP"
            @select="onTextureFile"
          >
            <template #filled>
              <div class="texture-wrap">
                <div class="texture-preview">
                  <img :src="store.document.background.textureUrl" alt="Текстура" />
                </div>
                <BaseButton size="sm" full-width danger-hover @click="removeTexture">
                  <X :size="14" /> Убрать
                </BaseButton>
              </div>
            </template>
          </ImageDropzone>
        </div>
      </div>
    </CollapsibleSection>
  </div>
</template>

<style lang="scss" scoped>
.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-3);
}

.fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.bg-types {
  display: flex;
  gap: var(--space-1);
}

.bg-texture {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.texture-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.texture-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
