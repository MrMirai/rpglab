<script setup>
import { ref } from 'vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
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

function onChange(e) {
  history.record(store)
  store.updateElement(props.element.id, { blendMode: e.target.value })
}
</script>

<template>
  <CollapsibleSection v-model:open="open" label="Наложение">
    <div class="section-body">
      <select class="select" :value="element.blendMode" @change="onChange">
        <option v-for="m in BLEND_MODES" :key="m.id" :value="m.id">{{ m.label }}</option>
      </select>
    </div>
  </CollapsibleSection>
</template>

<style lang="scss" scoped>
.section-body {
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
</style>
