<template>
  <div class="char-filters">

    <!-- Цвет -->
    <div class="char-filters__group">
      <div class="char-filters__group-header">
        <div class="char-filters__group-label">Цвет</div>
        <button class="char-filters__reset-group" @click="resetColor">
          <RotateCcw :size="11" />
        </button>
      </div>
      <SliderControl
        label="Оттенок"
        :model-value="store.charHue"
        :min="-180" :max="180" :step="1" suffix="°"
        @update:model-value="store.charHue = $event"
      />
      <SliderControl
        label="Насыщенность"
        :model-value="store.charSaturation"
        :min="0" :max="200" :step="1" suffix="%"
        @update:model-value="store.charSaturation = $event"
      />
    </div>

    <!-- Свет -->
    <div class="char-filters__group">
      <div class="char-filters__group-header">
        <div class="char-filters__group-label">Свет</div>
        <button class="char-filters__reset-group" @click="resetLight">
          <RotateCcw :size="11" />
        </button>
      </div>
      <SliderControl
        label="Яркость"
        :model-value="store.charBrightness"
        :min="0" :max="200" :step="1" suffix="%"
        @update:model-value="store.charBrightness = $event"
      />
      <SliderControl
        label="Контраст"
        :model-value="store.charContrast"
        :min="0" :max="200" :step="1" suffix="%"
        @update:model-value="store.charContrast = $event"
      />
    </div>

    <!-- Тень -->
    <div class="char-filters__group">
      <div class="char-filters__group-header">
        <div class="char-filters__group-label">Тень</div>
        <div class="char-filters__group-actions">
          <button
            v-if="store.charShadowEnabled"
            class="char-filters__reset-group"
            @click="resetShadow"
          >
            <RotateCcw :size="11" />
          </button>
          <div
            class="toggle"
            :class="{ 'toggle--on': store.charShadowEnabled }"
            @click="store.charShadowEnabled = !store.charShadowEnabled"
          >
            <div class="toggle__thumb" />
          </div>
        </div>
      </div>

      <template v-if="store.charShadowEnabled">
        <div class="char-filters__color-row">
          <span class="char-filters__field-label">Цвет</span>
          <ColorButton
            :model-value="store.charShadowColor"
            @update:model-value="store.charShadowColor = $event"
          />
        </div>
        <SliderControl
          label="Размытие"
          :model-value="store.charShadowBlur"
          :min="0" :max="80" :step="1" suffix="px"
          @update:model-value="store.charShadowBlur = $event"
        />
        <SliderControl
          label="Непрозрачность"
          :model-value="store.charShadowOpacity"
          :min="0" :max="100" :step="1" suffix="%"
          @update:model-value="store.charShadowOpacity = $event"
        />
        <SliderControl
          label="Смещение X"
          :model-value="store.charShadowOffsetX"
          :min="-60" :max="60" :step="1" suffix="px"
          @update:model-value="store.charShadowOffsetX = $event"
        />
        <SliderControl
          label="Смещение Y"
          :model-value="store.charShadowOffsetY"
          :min="-60" :max="60" :step="1" suffix="px"
          @update:model-value="store.charShadowOffsetY = $event"
        />
      </template>
    </div>

    <!-- Сброс всего -->
    <button class="char-filters__reset" @click="store.resetCharFilters()">
      <RotateCcw :size="13" /> Сбросить фильтры
    </button>

  </div>
</template>

<script setup>
import { RotateCcw } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import SliderControl from '@/shared/components/SliderControl.vue'
import ColorButton from '@/shared/components/ColorButton.vue'

const store = useEditorStore()

function resetColor() {
  store.charHue = 0
  store.charSaturation = 100
}

function resetLight() {
  store.charBrightness = 100
  store.charContrast = 100
}

function resetShadow() {
  store.charShadowColor = '#000000'
  store.charShadowBlur = 20
  store.charShadowOffsetX = 0
  store.charShadowOffsetY = 8
  store.charShadowOpacity = 60
}
</script>

<style lang="scss" scoped>
.char-filters {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  &__group-label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__group-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__reset-group {
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

  &__reset {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    width: 100%;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-2);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: border-color var(--transition-fast), color var(--transition-fast);

    &:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }
}

.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--color-border-strong);
  border: 1px solid var(--color-border-strong);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-normal), border-color var(--transition-normal);
  flex-shrink: 0;

  &__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-text-3);
    transition: left var(--transition-normal), background var(--transition-normal);
  }

  &--on {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);

    .toggle__thumb {
      left: 19px;
      background: var(--color-accent);
    }
  }
}
</style>
