<script setup>
import { ref } from 'vue'
import { ImagePlus, X } from 'lucide-vue-next'
import ColorButton from '@/shared/components/ColorButton.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import { useHandoutStore, SIZE_PRESETS } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import NumberField from './NumberField.vue'

// Свойства документа (показываются, когда ничего не выбрано):
// размер (пресет/произвольный) и фон (none/color/texture).
const store = useHandoutStore()
const history = useHandoutHistory()

const sections = ref({ size: true, background: true })
const textureInputRef = ref(null)

function onPresetChange(e) {
  const preset = SIZE_PRESETS.find((p) => p.id === e.target.value)
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
async function onTextureFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
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
        <select class="select" :value="store.document.sizePreset" @change="onPresetChange">
          <option v-for="p in SIZE_PRESETS" :key="p.id" :value="p.id">
            {{ p.label }}{{ p.width ? ` — ${p.width}×${p.height}` : '' }}
          </option>
        </select>

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
          <div v-if="store.document.background.textureUrl" class="texture-preview">
            <img :src="store.document.background.textureUrl" alt="Текстура" />
          </div>
          <BaseButton size="sm" full-width @click="textureInputRef?.click()">
            <ImagePlus :size="14" />
            {{ store.document.background.textureUrl ? 'Заменить' : 'Загрузить текстуру' }}
          </BaseButton>
          <BaseButton
            v-if="store.document.background.textureUrl"
            size="sm" full-width danger-hover
            @click="removeTexture"
          >
            <X :size="14" /> Убрать
          </BaseButton>
          <input ref="textureInputRef" type="file" accept="image/*" style="display: none" @change="onTextureFile" />
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

.select {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-1);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
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
