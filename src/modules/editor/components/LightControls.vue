<script setup>
import { computed } from 'vue'
import { Plus, Trash2, Eye, EyeOff, Lightbulb } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import SliderControl from '@/shared/components/SliderControl.vue'
import ColorButton from '@/shared/components/ColorButton.vue'
import CheckboxField from '@/shared/components/CheckboxField.vue'

const store = useEditorStore()

const selected = computed(() =>
  store.lights.find((l) => l.id === store.selectedLightId) || null
)

// Патч выбранного источника - все слайдеры пишут через него
function patch(field, value) {
  if (selected.value) store.updateLight(selected.value.id, { [field]: value })
}

function addLight() {
  store.addLight()
  // Добавление света осмысленно только с включённым инструментом «Свет»,
  // иначе маркер нового источника не виден и его нечем двигать.
  store.setActiveTool('light')
}
</script>

<template>
  <div class="light-controls">

    <!-- Список источников -->
    <div class="light-controls__list">
      <div
        v-for="light in store.lights"
        :key="light.id"
        class="light-item"
        :class="{ 'light-item--active': light.id === store.selectedLightId }"
        @click="store.selectLight(light.id)"
      >
        <span class="light-item__swatch" :style="{ background: light.color }" />
        <span class="light-item__name">
          {{ light.mode === 'auto' ? 'Авто (свечение)' : 'Источник' }}
        </span>
        <button
          class="light-item__btn"
          :title="light.visible ? 'Скрыть' : 'Показать'"
          @click.stop="store.updateLight(light.id, { visible: !light.visible })"
        >
          <Eye v-if="light.visible" :size="13" />
          <EyeOff v-else :size="13" />
        </button>
        <button class="light-item__btn light-item__btn--danger" title="Удалить"
          @click.stop="store.removeLight(light.id)">
          <Trash2 :size="13" />
        </button>
      </div>

      <p v-if="!store.lights.length" class="light-controls__empty">
        Источников света нет
      </p>
    </div>

    <button class="light-controls__add" @click="addLight">
      <Plus :size="13" />
      <span>Добавить источник</span>
    </button>

    <!-- Настройки выбранного источника -->
    <template v-if="selected">
      <div class="light-controls__divider" />

      <!-- Режим позиционирования -->
      <div class="light-controls__group">
        <div class="light-controls__group-label">Положение</div>
        <div class="light-controls__modes">
          <button
            class="light-controls__mode"
            :class="{ active: selected.mode === 'manual' }"
            @click="patch('mode', 'manual')"
          >
            Вручную
          </button>
          <button
            class="light-controls__mode"
            :class="{ active: selected.mode === 'auto' }"
            @click="patch('mode', 'auto')"
            title="Свет исходит от самых ярких пикселей персонажа"
          >
            По свечению
          </button>
        </div>

        <p v-if="selected.mode === 'auto'" class="light-controls__hint">
          <template v-if="store.hasChar">
            Источник привязан к самой яркой области персонажа и двигается вместе с ним.
          </template>
          <template v-else>
            Загрузи персонажа — источник встанет по его свечению.
          </template>
        </p>
        <p v-else class="light-controls__hint">
          <Lightbulb :size="11" />
          Перетаскивай маркер на холсте инструментом «Свет».
        </p>

        <template v-if="selected.mode === 'manual'">
          <SliderControl
            label="X" :model-value="selected.x"
            :min="-1000" :max="1500" :step="1" suffix="px"
            @update:model-value="patch('x', $event)"
          />
          <SliderControl
            label="Y" :model-value="selected.y"
            :min="-1000" :max="1500" :step="1" suffix="px"
            @update:model-value="patch('y', $event)"
          />
        </template>
      </div>

      <!-- Параметры свечения -->
      <div class="light-controls__group">
        <div class="light-controls__group-label">Свечение</div>

        <div class="light-controls__color-row">
          <span class="light-controls__field-label">Цвет</span>
          <ColorButton
            :model-value="selected.color"
            @update:model-value="patch('color', $event)"
          />
        </div>

        <SliderControl
          label="Радиус" :model-value="selected.radius"
          :min="10" :max="1200" :step="1" suffix="px"
          @update:model-value="patch('radius', $event)"
        />
        <SliderControl
          label="Интенсивность" :model-value="selected.intensity"
          :min="0" :max="100" :step="1" suffix="%"
          @update:model-value="patch('intensity', $event)"
        />
        <SliderControl
          label="Мягкость" :model-value="selected.falloff"
          :min="0" :max="100" :step="1" suffix="%"
          @update:model-value="patch('falloff', $event)"
        />
      </div>

      <!-- На что светит -->
      <div class="light-controls__group">
        <div class="light-controls__group-label">Освещает</div>
        <CheckboxField
          label="Рамку"
          :model-value="selected.onFrame"
          @update:model-value="patch('onFrame', $event)"
        />
        <CheckboxField
          label="Персонажа"
          :model-value="selected.onChar"
          @update:model-value="patch('onChar', $event)"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.light-controls {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  &__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__empty {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    padding: var(--space-2) 0;
  }

  &__add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2);
    width: 100%;
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-2);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: border-color var(--transition-fast), color var(--transition-fast);

    &:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }

  &__divider {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-1) 0;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__group-label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-1);
  }

  &__modes {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-1);
  }

  &__mode {
    flex: 1;
    padding: var(--space-2);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-2);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover { color: var(--color-text-1); }

    &.active {
      background: var(--color-accent-muted);
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }

  &__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-xs);
    color: var(--color-text-3);
    line-height: 1.4;
    margin-bottom: var(--space-1);
  }

  &__color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  &__field-label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
  }

}

.light-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);

  &:hover { background: var(--color-bg-3); }

  &--active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
  }

  &__swatch {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid var(--color-border-strong);
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: var(--text-xs);
    color: var(--color-text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__btn {
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

    &:hover { color: var(--color-text-1); }

    &--danger:hover { color: var(--color-danger); }
  }
}
</style>
