<script setup>
import { ref, computed } from 'vue'
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-vue-next'
import ColorButton from '@/shared/components/ColorButton.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import SliderControl from '@/shared/components/SliderControl.vue'
import CollapsibleSection from '@/shared/components/CollapsibleSection.vue'
import { useHandoutStore } from '../store'
import { useHandoutHistory } from '../composables/useHandoutHistory'
import NumberField from './NumberField.vue'
import TransformSection from './TransformSection.vue'
import BlendModeSelect from './BlendModeSelect.vue'

// Свойства выбранного текстового элемента.
const props = defineProps({
  element: { type: Object, required: true },
})

const store = useHandoutStore()
const history = useHandoutHistory()

const sections = ref({ font: true, color: true, spacing: true })

// Web-safe шрифты + пара тематических generic-стеков
const FONT_FAMILIES = [
  'Georgia',
  'Times New Roman',
  'Palatino Linotype',
  'Garamond',
  'Arial',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Impact',
]

function update(propsPatch, key = null) {
  history.record(store, key ? `text-${key}:${props.element.id}` : null)
  store.updateElement(props.element.id, propsPatch)
}

const isBold = computed(() => props.element.fontStyle.includes('bold'))
const isItalic = computed(() => props.element.fontStyle.includes('italic'))

function toggleBold() {
  const italic = isItalic.value
  const bold = !isBold.value
  update({ fontStyle: [bold && 'bold', italic && 'italic'].filter(Boolean).join(' ') || 'normal' })
}

function toggleItalic() {
  const italic = !isItalic.value
  const bold = isBold.value
  update({ fontStyle: [bold && 'bold', italic && 'italic'].filter(Boolean).join(' ') || 'normal' })
}

function toggleUnderline() {
  update({ textDecoration: props.element.textDecoration === 'underline' ? 'none' : 'underline' })
}

const aligns = [
  { id: 'left', icon: AlignLeft },
  { id: 'center', icon: AlignCenter },
  { id: 'right', icon: AlignRight },
  { id: 'justify', icon: AlignJustify },
]
</script>

<template>
  <div class="text-props">
    <CollapsibleSection v-model:open="sections.font" label="Шрифт">
      <div class="section-body">
        <select
          class="select"
          :value="element.fontFamily"
          @change="update({ fontFamily: $event.target.value })"
        >
          <option v-for="f in FONT_FAMILIES" :key="f" :value="f" :style="{ fontFamily: f }">
            {{ f }}
          </option>
        </select>

        <div class="font-row">
          <NumberField
            label="Размер"
            :model-value="element.fontSize"
            :min="6" :max="300"
            @update:model-value="update({ fontSize: $event }, 'size')"
          />
        </div>

        <div class="style-row">
          <BaseButton size="sm" square :active="isBold" title="Жирный" @click="toggleBold">
            <Bold :size="14" />
          </BaseButton>
          <BaseButton size="sm" square :active="isItalic" title="Курсив" @click="toggleItalic">
            <Italic :size="14" />
          </BaseButton>
          <BaseButton size="sm" square :active="element.textDecoration === 'underline'" title="Подчёркнутый" @click="toggleUnderline">
            <Underline :size="14" />
          </BaseButton>
          <span class="style-row__divider" />
          <BaseButton
            v-for="a in aligns"
            :key="a.id"
            size="sm" square
            :active="element.align === a.id"
            @click="update({ align: a.id })"
          >
            <component :is="a.icon" :size="14" />
          </BaseButton>
        </div>
      </div>
    </CollapsibleSection>

    <CollapsibleSection v-model:open="sections.color" label="Цвет">
      <div class="section-body">
        <div class="color-row">
          <span class="color-row__label">Текст</span>
          <ColorButton
            :model-value="element.color"
            @update:model-value="update({ color: $event }, 'color')"
          />
        </div>
        <div class="color-row">
          <span class="color-row__label">Фон</span>
          <ColorButton
            v-if="element.backgroundColor"
            :model-value="element.backgroundColor"
            @update:model-value="update({ backgroundColor: $event }, 'bg-color')"
          />
          <BaseButton
            size="sm"
            @click="update({ backgroundColor: element.backgroundColor ? null : '#f5ecd8' })"
          >
            {{ element.backgroundColor ? 'Убрать' : 'Добавить' }}
          </BaseButton>
        </div>
      </div>
    </CollapsibleSection>

    <CollapsibleSection v-model:open="sections.spacing" label="Интервалы">
      <div class="section-body">
        <SliderControl
          label="Межстрочный"
          :model-value="element.lineHeight"
          :min="0.8" :max="3" :step="0.05"
          @update:model-value="update({ lineHeight: $event }, 'line-height')"
        />
        <SliderControl
          label="Межбуквенный"
          :model-value="element.letterSpacing"
          :min="-5" :max="20" :step="0.5"
          @update:model-value="update({ letterSpacing: $event }, 'letter-spacing')"
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

.style-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);

  &__divider {
    width: 1px;
    height: 16px;
    background: var(--color-border);
    margin: 0 var(--space-1);
  }
}

.color-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    min-width: 40px;
  }
}
</style>
