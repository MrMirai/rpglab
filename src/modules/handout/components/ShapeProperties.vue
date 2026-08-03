<script setup>
import { ref } from 'vue'
import ColorButton from '@/shared/components/ColorButton.vue'
import SliderControl from '@/shared/components/SliderControl.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import CheckboxField from '@/shared/components/CheckboxField.vue'
import PropertyRow from '@/shared/components/PropertyRow.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import TransformSection from './TransformSection.vue'
import BlendModeSelect from './BlendModeSelect.vue'
import InkEffectSection from './InkEffectSection.vue'

// Свойства выбранной фигуры (прямоугольник / эллипс).
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const sections = ref({ fill: true, stroke: true })

function update(patch, key = null) {
  history.record(store, key ? `shape-${key}:${props.element.id}` : null)
  store.updateElement(props.element.id, patch)
}
</script>

<template>
  <div class="shape-props">
    <CollapsibleSection v-model:open="sections.fill" label="Заливка">
      <div class="section-body">
        <CheckboxField
          label="Без заливки"
          :model-value="element.fill === 'none'"
          @update:model-value="update({ fill: $event ? 'none' : '#c4954a' })"
        />
        <PropertyRow v-if="element.fill !== 'none'" label="Цвет">
          <ColorButton
            :model-value="element.fill"
            @update:model-value="update({ fill: $event }, 'fill')"
          />
        </PropertyRow>
      </div>
    </CollapsibleSection>

    <CollapsibleSection v-model:open="sections.stroke" label="Обводка">
      <div class="section-body">
        <PropertyRow label="Цвет">
          <ColorButton
            :model-value="element.stroke"
            @update:model-value="update({ stroke: $event }, 'stroke')"
          />
        </PropertyRow>
        <SliderControl
          label="Толщина"
          :model-value="element.strokeWidth"
          :min="0" :max="20" :step="1" suffix="px"
          @update:model-value="update({ strokeWidth: $event }, 'stroke-w')"
        />
        <SliderControl
          v-if="element.shapeType === 'rect'"
          label="Скругление"
          :model-value="element.cornerRadius"
          :min="0" :max="200" :step="1" suffix="px"
          @update:model-value="update({ cornerRadius: $event }, 'radius')"
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
</style>
