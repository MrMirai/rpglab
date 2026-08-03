<script setup>
import { ImagePlus, Pipette, X } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useImageLoader } from '../composables/useImageLoader'
import { useAutoBackground } from '../composables/useAutoBackground'
import SliderControl from '@/shared/components/SliderControl.vue'
import ColorButton from '@/shared/components/ColorButton.vue'
import PropertyRow from '@/shared/components/PropertyRow.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import SegmentedControl from '@/shared/components/SegmentedControl.vue'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()
const { extractColor } = useAutoBackground()

// «Картинка» сокращена до «Фото»: четыре сегмента в панели 260px не вмещают
// длинное слово, оно обрезалось многоточием
const typeOptions = [
  { value: 'none',  label: 'Нет' },
  { value: 'color', label: 'Цвет' },
  { value: 'image', label: 'Фото', title: 'Картинка' },
  { value: 'auto',  label: 'Авто' },
]

const noiseOptions = [
  { value: 'random', label: 'Случайный' },
  { value: 'perlin', label: 'Перлин' },
]

function colorToHex(c) {
  return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function selectType(type) {
  store.setBgType(type)
  if (type === 'auto' && store.frameImage) {
    store.setBgAutoColor(colorToHex(extractColor(store.frameImage)))
  }
}

function repickColor() {
  if (!store.frameImage) return
  store.setBgAutoColor(colorToHex(extractColor(store.frameImage)))
}

const swatches = [
  '#1a1a2e', '#16213e', '#0f3460',
  '#1b1b1b', '#2d2d2d', '#4a4a4a',
  '#2c1810', '#1a2c10', '#10102c',
  '#f0ede6', '#e8d5b7', '#d4c5a9',
]

async function loadFile(file) {
  const img = await loadFromFile(file)
  const url = URL.createObjectURL(file)
  store.loadBgImage(img, url)
}
</script>

<template>
  <div class="bg-controls">

    <SegmentedControl
      class="bg-controls__types"
      :model-value="store.bgType"
      :options="typeOptions"
      @update:model-value="selectType($event)"
    />

    <div v-if="store.bgType === 'color'" class="bg-controls__color">
      <PropertyRow label="Цвет">
        <ColorButton
          :model-value="store.bgColor"
          @update:model-value="store.setBgColor($event)"
        />
      </PropertyRow>
      <div class="bg-controls__swatches">
        <button
          v-for="color in swatches"
          :key="color"
          class="swatch"
          :style="{ background: color }"
          :class="{ active: store.bgColor === color }"
          @click="store.setBgColor(color)"
        />
      </div>
    </div>

    <div v-else-if="store.bgType === 'image'" class="bg-controls__image">
      <ImageDropzone
        :filled="!!store.bgImage"
        accept="image/*"
        label="Загрузить фон"
        hint="PNG, JPG, WebP"
        @select="loadFile"
      >
        <template #icon>
          <ImagePlus :size="24" />
        </template>

        <template #filled>
          <div class="bg-preview">
            <div class="bg-preview__thumb">
              <img :src="store.bgPreviewUrl" alt="Фон" />
            </div>
            <BaseButton size="sm" full-width danger-hover @click="store.removeBgImage()">
              <X :size="14" /> Удалить
            </BaseButton>
          </div>
        </template>
      </ImageDropzone>
    </div>

    <div v-else-if="store.bgType === 'auto'" class="bg-controls__auto">
      <PropertyRow label="Базовый">
        <ColorButton
          :model-value="store.bgAutoColor"
          @update:model-value="store.setBgAutoColor($event)"
        />
        <BaseButton size="sm" square @click="repickColor" title="Подобрать из рамки">
          <Pipette :size="14" />
        </BaseButton>
      </PropertyRow>

      <SliderControl
        label="Яркость центра"
        :model-value="Math.round(store.bgCenterLight * 100)"
        :min="20" :max="150" :step="1" suffix="%"
        @update:model-value="store.bgCenterLight = $event / 100"
      />
      <SliderControl
        label="Яркость краёв"
        :model-value="Math.round(store.bgEdgeLight * 100)"
        :min="20" :max="200" :step="1" suffix="%"
        @update:model-value="store.bgEdgeLight = $event / 100"
      />
      <SliderControl
        label="Сила шума"
        :model-value="store.bgNoiseStrength"
        :min="0" :max="60" :step="1" suffix="%"
        @update:model-value="store.bgNoiseStrength = $event"
      />

      <label class="bg-controls__label">Тип шума</label>
      <SegmentedControl
        class="bg-controls__types"
        :model-value="store.bgNoiseType"
        :options="noiseOptions"
        @update:model-value="store.setBgNoiseType($event)"
      />

      <SliderControl
        label="Зерно шума"
        :model-value="store.bgGrain"
        :min="1" :max="12" :step="1"
        @update:model-value="store.bgGrain = $event"
      />
    </div>

  </div>
</template>

<style lang="scss" scoped>
.bg-controls {
  padding: var(--space-3) var(--space-4);

  &__types {
    margin-bottom: var(--space-3);
  }

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__swatches {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  &__image {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
}

.swatch {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: transform var(--transition-fast);

  &:hover { transform: scale(1.2); }
  &.active { outline: 2px solid var(--color-accent); outline-offset: 1px; }
}

.bg-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-bg-1);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}
</style>
