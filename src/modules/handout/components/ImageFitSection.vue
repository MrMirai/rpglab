<script setup>
import { ref, computed } from 'vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import SelectField from '@/shared/components/SelectField.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'

// Секция «Вписывание» — режим fit (contain/cover/fill) для картинок.
// elements — массив, поддерживает мультивыделение (только среди IMAGE):
// если fit у выбранных отличается, показываем placeholder вместо значения.
const props = defineProps({
  elements: { type: Array, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const open = ref(true)

const FITS = [
  { id: 'contain', label: 'Вписать' },
  { id: 'cover', label: 'Заполнить' },
  { id: 'fill', label: 'Растянуть' },
]
const fitOptions = FITS.map((f) => ({ value: f.id, label: f.label }))

const commonFit = computed(() => {
  const first = props.elements[0].fit
  return props.elements.every((el) => el.fit === first) ? first : null
})

function onChange(value) {
  history.record(store)
  props.elements.forEach((el) => store.updateElement(el.id, { fit: value }))
}
</script>

<template>
  <CollapsibleSection v-model:open="open" label="Вписывание">
    <div class="section-body">
      <SelectField
        :model-value="commonFit"
        :options="fitOptions"
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
