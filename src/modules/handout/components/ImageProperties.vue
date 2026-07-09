<script setup>
import { ref } from 'vue'
import { ImagePlus, RotateCcw } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import SliderControl from '@/shared/components/SliderControl.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import TransformSection from './TransformSection.vue'
import BlendModeSelect from './BlendModeSelect.vue'

// Свойства выбранного изображения.
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const sections = ref({ image: true, view: true, correction: true })
const fileInputRef = ref(null)

const FITS = [
  { id: 'contain', label: 'Вписать' },
  { id: 'cover', label: 'Заполнить' },
  { id: 'fill', label: 'Растянуть' },
]

function update(patch, key = null) {
  history.record(store, key ? `img-${key}:${props.element.id}` : null)
  store.updateElement(props.element.id, patch)
}

function onReplaceFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  update({ url: URL.createObjectURL(file), assetId: null })
}

function resetFilters() {
  history.record(store)
  store.resetImageFilters(props.element.id)
}
</script>

<template>
  <div class="image-props">
    <CollapsibleSection v-model:open="sections.image" label="Изображение">
      <div class="section-body">
        <BaseButton size="sm" full-width @click="fileInputRef?.click()">
          <ImagePlus :size="14" /> Заменить
        </BaseButton>
        <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="onReplaceFile" />

        <select class="select" :value="element.fit" @change="update({ fit: $event.target.value })">
          <option v-for="f in FITS" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
      </div>
    </CollapsibleSection>

    <CollapsibleSection v-model:open="sections.view" label="Вид">
      <div class="section-body">
        <SliderControl
          label="Прозрачность"
          :model-value="Math.round(element.opacity * 100)"
          :min="0" :max="100" :step="1" suffix="%"
          @update:model-value="update({ opacity: $event / 100 }, 'opacity')"
        />
        <SliderControl
          label="Скругление"
          :model-value="element.cornerRadius"
          :min="0" :max="200" :step="1" suffix="px"
          @update:model-value="update({ cornerRadius: $event }, 'radius')"
        />
      </div>
    </CollapsibleSection>

    <CollapsibleSection v-model:open="sections.correction" label="Коррекция">
      <div class="section-body">
        <div class="correction-header">
          <span class="correction-hint">Цвет и свет</span>
          <button class="reset-btn" title="Сбросить коррекцию" @click="resetFilters">
            <RotateCcw :size="12" />
          </button>
        </div>
        <SliderControl
          label="Оттенок"
          :model-value="element.hue"
          :min="-180" :max="180" :step="1" suffix="°"
          @update:model-value="update({ hue: $event }, 'hue')"
        />
        <SliderControl
          label="Насыщенность"
          :model-value="element.saturation"
          :min="0" :max="200" :step="1" suffix="%"
          @update:model-value="update({ saturation: $event }, 'sat')"
        />
        <SliderControl
          label="Яркость"
          :model-value="element.brightness"
          :min="0" :max="200" :step="1" suffix="%"
          @update:model-value="update({ brightness: $event }, 'bri')"
        />
        <SliderControl
          label="Контраст"
          :model-value="element.contrast"
          :min="0" :max="200" :step="1" suffix="%"
          @update:model-value="update({ contrast: $event }, 'con')"
        />
      </div>
    </CollapsibleSection>

    <BlendModeSelect :element="element" />

    <TransformSection :element="element" />
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

.correction-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.correction-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: none;
  border: none;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);

  &:hover {
    color: var(--color-text-1);
  }
}
</style>
