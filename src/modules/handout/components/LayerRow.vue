<script setup>
import { computed } from 'vue'
import {
  Type, Image as ImageIcon, Square, Circle,
  Eye, EyeOff, Lock, Unlock, Copy, Trash2,
} from 'lucide-vue-next'

// Строка списка слоёв. Чистая презентация: политику задаёт родитель через
// пропсы/события, обращений к стору тут нет.
const props = defineProps({
  element: { type: Object, required: true },
  active: { type: Boolean, default: false },
})

defineEmits(['select', 'toggle-visible', 'toggle-locked', 'duplicate', 'remove'])

const icon = computed(() => {
  if (props.element.type === 'TEXT') return Type
  if (props.element.type === 'IMAGE') return ImageIcon
  return props.element.shapeType === 'ellipse' ? Circle : Square
})

// У текста имя - его первая строка, у остальных типов имени нет: показываем тип.
const name = computed(() => {
  const el = props.element
  if (el.type === 'TEXT') return el.content.split('\n')[0].trim().slice(0, 40) || 'Текст'
  if (el.type === 'IMAGE') return 'Картинка'
  return el.shapeType === 'ellipse' ? 'Эллипс' : 'Прямоугольник'
})

const meta = computed(() => {
  const el = props.element
  const size = `${Math.round(el.width)}×${Math.round(el.height)}`
  if (el.type === 'TEXT') return `${Math.round(el.fontSize)} pt · ${Math.round(el.width)} px`
  return size
})

// Свотч только у фигуры с заливкой: у текста он был бы глухим квадратом,
// неотличимым от прямоугольника.
const swatch = computed(() => {
  const el = props.element
  if (el.type === 'SHAPE') return el.fill && el.fill !== 'none' ? el.fill : null
  return null
})

const dimmed = computed(() => !props.element.visible || props.element.opacity === 0)
</script>

<template>
  <li
    class="layer"
    :class="{ 'is-active': active, 'is-dimmed': dimmed, 'is-locked': element.locked }"
    :title="name"
    @click="$emit('select', $event)"
  >
    <!-- Превью слоя -->
    <span class="layer__thumb">
      <img v-if="element.type === 'IMAGE' && element.url" :src="element.url" alt="" />
      <span v-else-if="swatch" class="layer__swatch" :style="{ background: swatch }" />
      <component :is="icon" v-else :size="14" />
    </span>

    <span class="layer__text">
      <span class="layer__name">{{ name }}</span>
      <span class="layer__meta">{{ meta }}</span>
    </span>

    <span class="layer__actions" @click.stop>
      <button
        type="button"
        class="layer__btn layer__btn--hover-only"
        title="Дублировать"
        @click="$emit('duplicate')"
      >
        <Copy :size="13" />
      </button>
      <button
        type="button"
        class="layer__btn layer__btn--hover-only layer__btn--danger"
        title="Удалить"
        @click="$emit('remove')"
      >
        <Trash2 :size="13" />
      </button>

      <!-- Видимость/замок - индикаторы состояния, а не только кнопки:
           скрытый/залоченный слой должен читаться без наведения мыши -->
      <button
        type="button"
        class="layer__btn layer__btn--state"
        :class="{ 'is-on': !element.visible }"
        :title="element.visible ? 'Скрыть слой' : 'Показать слой'"
        @click="$emit('toggle-visible')"
      >
        <Eye v-if="element.visible" :size="13" />
        <EyeOff v-else :size="13" />
      </button>
      <button
        type="button"
        class="layer__btn layer__btn--state"
        :class="{ 'is-on': element.locked }"
        :title="element.locked ? 'Разблокировать слой' : 'Заблокировать слой'"
        @click="$emit('toggle-locked')"
      >
        <Lock v-if="element.locked" :size="13" />
        <Unlock v-else :size="13" />
      </button>
    </span>
  </li>
</template>

<style lang="scss" scoped>
.layer {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  // Фиксированная высота: строки не «прыгают» от разной длины контента
  height: 40px;
  padding: 0 var(--space-1) 0 var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);

  &:hover {
    background: var(--color-bg-3);
  }

  &.is-active {
    background: var(--color-accent-muted);
    border-color: rgba(196, 149, 74, 0.4);

    .layer__name { color: var(--color-accent); }
  }

  &.is-dimmed {
    .layer__thumb,
    .layer__text { opacity: 0.45; }
  }

  &.is-locked {
    cursor: default;
  }

  &__thumb {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    color: var(--color-text-3);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__swatch {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    // Светлая заливка на светлом свотче иначе сливается с рамкой
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  }

  &__text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: var(--text-xs);
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    font-size: 10px;
    color: var(--color-text-3);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-3);
    cursor: pointer;
    overflow: hidden;
    transition:
      color var(--transition-fast),
      opacity var(--transition-fast),
      width var(--transition-fast),
      background-color var(--transition-fast);

    &:hover {
      background: var(--color-bg-1);
      color: var(--color-accent);
    }

    &--danger:hover {
      color: var(--color-danger);
    }

    // Схлопываются в ноль ширины, а не просто гаснут: в 240px-панели
    // зарезервированное под них место обрезало бы имя слоя многоточием
    &--hover-only,
    &--state:not(.is-on) {
      width: 0;
      opacity: 0;
    }

    &--state.is-on {
      width: 22px;
      opacity: 1;
      color: var(--color-accent);
    }
  }

  &:hover &__btn,
  &.is-active &__btn,
  &:focus-within &__btn {
    width: 22px;
    opacity: 1;
  }
}
</style>
