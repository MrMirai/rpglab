<script setup>
import { ref } from 'vue'
import { ImagePlus, Pipette } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useImageLoader } from '../composables/useImageLoader'
import { useAutoBackground } from '../composables/useAutoBackground'
import SliderControl from './SliderControl.vue'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()
const { extractColor } = useAutoBackground()
const fileInput = ref(null)
const previewUrl = ref(null)

const typeOptions = [
  { value: 'none',  label: 'Нет' },
  { value: 'color', label: 'Цвет' },
  { value: 'image', label: 'Картинка' },
  { value: 'auto',  label: 'Авто' },
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

function triggerFileInput() { fileInput.value.click() }

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const img = await loadFromFile(file)
  previewUrl.value = URL.createObjectURL(file)
  store.loadBgImage(img)
}
</script>

<template>
  <div class="bg-controls">

    <div class="bg-controls__types">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        :class="['type-btn', { active: store.bgType === opt.value }]"
        @click="selectType(opt.value)"
      >{{ opt.label }}</button>
    </div>

    <div v-if="store.bgType === 'color'" class="bg-controls__color">
      <label class="bg-controls__label">Цвет фона</label>
      <div class="bg-controls__color-row">
        <input
          type="color"
          :value="store.bgColor"
          class="color-picker"
          @input="store.setBgColor($event.target.value)"
        />
        <span class="color-value">{{ store.bgColor }}</span>
      </div>
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
      <button class="upload-btn" @click="triggerFileInput">
        <ImagePlus :size="16" />
        {{ store.bgImage ? 'Заменить фон' : 'Загрузить фон' }}
      </button>
      <div v-if="store.bgImage" class="bg-preview">
        <img :src="previewUrl" alt="Фон" />
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onFileChange"
      />
    </div>

    <div v-else-if="store.bgType === 'auto'" class="bg-controls__auto">
      <label class="bg-controls__label">Базовый цвет</label>
      <div class="bg-controls__color-row">
        <input
          type="color"
          :value="store.bgAutoColor"
          class="color-picker"
          @input="store.setBgAutoColor($event.target.value)"
        />
        <span class="color-value">{{ store.bgAutoColor }}</span>
        <button class="repick-btn" @click="repickColor" title="Подобрать из рамки">
          <Pipette :size="14" />
        </button>
      </div>

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
      <div class="bg-controls__types" style="margin-bottom: var(--space-3)">
        <button
          :class="['type-btn', { active: store.bgNoiseType === 'random' }]"
          @click="store.setBgNoiseType('random')"
        >Случайный</button>
        <button
          :class="['type-btn', { active: store.bgNoiseType === 'perlin' }]"
          @click="store.setBgNoiseType('perlin')"
        >Перлин</button>
      </div>

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
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    display: block;
    margin-bottom: var(--space-2);
  }

  &__color-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
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

.type-btn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:hover:not(.active) {
    border-color: var(--color-border-strong);
    color: var(--color-text-1);
  }
}

.color-picker {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-1);
  cursor: pointer;
}

.repick-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}

.color-value {
  font-size: var(--text-xs);
  color: var(--color-text-2);
  font-variant-numeric: tabular-nums;
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

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}

.bg-preview {
  width: 100%;
  aspect-ratio: 1;
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
