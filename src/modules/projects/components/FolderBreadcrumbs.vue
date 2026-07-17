<script setup>
import { computed, ref } from 'vue'
import { ChevronRight, Home } from 'lucide-vue-next'

// Хлебные крошки к открытой папке. Корень («Мои проекты», id=null) всегда первый.
// Каждая крошка — навигация (клик) и drop-цель (бросить папку → переместить в этот
// уровень вложенности). Политику задаёт родитель через события navigate/drop-to.
const props = defineProps({
  // [{ id, name }] от корня до текущей папки включительно (пусто в корне).
  trail: { type: Array, default: () => [] },
})

const emit = defineEmits(['navigate', 'drop-to'])

// Корневая крошка + путь. У корня id=null.
const crumbs = computed(() => [{ id: null, name: 'Мои проекты', root: true }, ...props.trail])

// id крошки, над которой сейчас тащат папку (для подсветки). Symbol для null-корня.
const ROOT_KEY = 'root'
const dropTarget = ref(null)

function keyOf(crumb) {
  return crumb.id ?? ROOT_KEY
}

function onDragOver(e, crumb, isLast) {
  if (isLast) return // на текущую папку перемещать некуда
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dropTarget.value = keyOf(crumb)
}

function onDrop(e, crumb, isLast) {
  dropTarget.value = null
  if (isLast) return
  e.preventDefault()
  const draggedId = e.dataTransfer.getData('text/plain')
  if (draggedId) emit('drop-to', { draggedId, targetId: crumb.id })
}
</script>

<template>
  <nav class="breadcrumbs" aria-label="Путь к папке">
    <template v-for="(crumb, i) in crumbs" :key="keyOf(crumb)">
      <ChevronRight v-if="i > 0" :size="14" class="breadcrumbs__sep" />
      <button
        class="breadcrumbs__item"
        :class="{
          'is-current': i === crumbs.length - 1,
          'is-drop-active': dropTarget === keyOf(crumb),
        }"
        :disabled="i === crumbs.length - 1"
        @click="$emit('navigate', crumb.id)"
        @dragover="onDragOver($event, crumb, i === crumbs.length - 1)"
        @dragleave="dropTarget = null"
        @drop="onDrop($event, crumb, i === crumbs.length - 1)"
      >
        <Home v-if="crumb.root" :size="14" class="breadcrumbs__home" />
        <span>{{ crumb.name }}</span>
      </button>
    </template>
  </nav>
</template>

<style lang="scss" scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.breadcrumbs__sep {
  color: var(--color-text-3);
  flex-shrink: 0;
}

.breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  font-family: inherit;
  color: var(--color-text-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--color-accent);
  }

  &.is-current {
    color: var(--color-text-1);
    font-weight: var(--weight-medium);
    cursor: default;
  }

  &.is-drop-active {
    color: var(--color-accent);
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
  }
}

.breadcrumbs__home {
  flex-shrink: 0;
}
</style>
