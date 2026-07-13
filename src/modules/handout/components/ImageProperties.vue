<script setup>
import { ref } from 'vue'
import { ImagePlus, RotateCcw } from 'lucide-vue-next'
import SliderControl from '@/shared/components/SliderControl.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import TransformSection from './TransformSection.vue'
import BlendModeSelect from './BlendModeSelect.vue'
import InkEffectSection from './InkEffectSection.vue'
import ImageFitSection from './ImageFitSection.vue'

// Свойства выбранного изображения.
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const sections = ref({ image: true, view: true, correction: true })

function update(patch, key = null) {
  history.record(store, key ? `img-${key}:${props.element.id}` : null)
  store.updateElement(props.element.id, patch)
}

function onReplaceFile(file) {
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
        <ImageDropzone accept="image/*" label="Заменить изображение" hint="PNG, JPG, WebP" @select="onReplaceFile">
          <template #icon>
            <ImagePlus :size="20" />
          </template>
        </ImageDropzone>
      </div>
    </CollapsibleSection>

    <ImageFitSection :elements="[element]" />

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

    <InkEffectSection :elements="[element]" />

    <BlendModeSelect :elements="[element]" />

    <TransformSection :elements="[element]" />
  </div>
</template>

<style lang="scss" scoped>
.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-3);
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
