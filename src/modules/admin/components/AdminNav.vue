<script setup>
import { Frame } from 'lucide-vue-next'

// Локальная навигация админ-секции. Задел на рост — разделы для раздаток,
// тарифы и т.п. добавятся сюда же новыми пунктами. Управление тегами не
// вынесено отдельным пунктом — оно относится к рамкам и живёт внутри
// экрана «Системные рамки» (сворачиваемый блок).
defineProps({
  active: { type: String, required: true },
})

defineEmits(['select'])

const sections = [{ id: 'frames', label: 'Системные рамки', icon: Frame }]
</script>

<template>
  <nav class="admin-nav">
    <button
      v-for="section in sections"
      :key="section.id"
      type="button"
      class="admin-nav__item"
      :class="{ active: active === section.id }"
      @click="$emit('select', section.id)"
    >
      <component :is="section.icon" :size="16" />
      {{ section.label }}
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-2);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      background-color: var(--color-bg-3);
      color: var(--color-text-1);
    }

    &.active {
      background-color: var(--color-accent-muted);
      color: var(--color-accent);
    }
  }
}
</style>
