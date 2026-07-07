<script setup>
// Список кликабельных бейджей тегов — переиспользуется в выборе тегов формы
// (мультиселект из справочника) и в фильтре галереи. Без бизнес-логики:
// какие теги показывать и что значит «активен» — решает родитель.
defineProps({
  tags: { type: Array, required: true }, // [{ id, label }] — id может быть числом или строкой (имя тега)
  activeIds: { type: Array, default: () => [] },
})

defineEmits(['toggle'])
</script>

<template>
  <div class="tag-badge-list">
    <button
      v-for="tag in tags"
      :key="tag.id"
      type="button"
      class="tag-badge"
      :class="{ active: activeIds.includes(tag.id) }"
      @click="$emit('toggle', tag.id)"
    >
      {{ tag.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.tag-badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tag-badge {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(.active) {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}
</style>
