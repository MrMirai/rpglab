<script setup>
import { ref, computed } from 'vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import SelectField from '@/shared/components/SelectField.vue'
import { useHandoutStore, BLEND_MODES } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'

// Секция «Наложение» — выбор режима смешивания (globalCompositeOperation).
// Доступна всем типам элементов (как слой-blend в Figma).
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const open = ref(true)

const blendOptions = computed(() => BLEND_MODES.map((m) => ({ value: m.id, label: m.label })))

function onChange(value) {
  history.record(store)
  store.updateElement(props.element.id, { blendMode: value })
}
</script>

<template>
  <CollapsibleSection v-model:open="open" label="Наложение">
    <div class="section-body">
      <SelectField :model-value="element.blendMode" :options="blendOptions" @update:model-value="onChange" />
    </div>
  </CollapsibleSection>
</template>

<style lang="scss" scoped>
.section-body {
  padding: 0 var(--space-4) var(--space-3);
}
</style>
