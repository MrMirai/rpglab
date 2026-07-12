<script setup>
import { ref } from 'vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import SliderControl from '@/shared/components/SliderControl.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'

// Секция «Смешение с фоном» — эффект «нанесено на бумагу» (см. useInkEffect):
// один слайдер силы управляет multiply-наложением, зерном бумаги, выедающим
// краску, и рваным краем. Доступна всем типам элементов.
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const open = ref(true)

function onChange(value) {
  history.record(store, `ink:${props.element.id}`)
  store.updateElement(props.element.id, { inkStrength: value })
}
</script>

<template>
  <CollapsibleSection v-model:open="open" label="Смешение с фоном">
    <div class="section-body">
      <SliderControl
        label="Сила"
        :model-value="element.inkStrength ?? 0"
        :min="0" :max="100" :step="1" suffix="%"
        @update:model-value="onChange"
      />
      <p class="ink-hint">
        Регулирует, насколько элемент впитывается в бумагу: цвет, зерно и край
        подстраиваются под фон.
      </p>
    </div>
  </CollapsibleSection>
</template>

<style lang="scss" scoped>
.section-body {
  padding: 0 var(--space-4) var(--space-3);
}

.ink-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  line-height: 1.4;
}
</style>
