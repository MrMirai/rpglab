<script setup>
import { ref, computed } from 'vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import SelectField from '@/shared/components/SelectField.vue'
import { useHandoutStore, BLEND_MODES } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'

// Секция «Наложение» — выбор режима смешивания (globalCompositeOperation).
// Доступна всем типам элементов (как слой-blend в Figma). elements — массив,
// поддерживает мультивыделение: если режимы у выбранных элементов различаются,
// показываем placeholder вместо конкретного значения (SelectField modelValue=null).
const props = defineProps({
  elements: { type: Array, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const open = ref(true)

const blendOptions = computed(() => BLEND_MODES.map((m) => ({ value: m.id, label: m.label })))

const commonBlendMode = computed(() => {
  const first = props.elements[0].blendMode
  return props.elements.every((el) => el.blendMode === first) ? first : null
})

function onChange(value) {
  history.record(store)
  props.elements.forEach((el) => store.updateElement(el.id, { blendMode: value }))
}
</script>

<template>
  <CollapsibleSection v-model:open="open" label="Наложение">
    <div class="section-body">
      <SelectField
        :model-value="commonBlendMode"
        :options="blendOptions"
        placeholder="Разные"
        @update:model-value="onChange"
      />
    </div>
  </CollapsibleSection>
</template>

<style lang="scss" scoped>
.section-body {
  padding: 0 var(--space-4) var(--space-3);
}
</style>
