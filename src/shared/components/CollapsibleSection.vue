<script setup>
// Сворачиваемая секция панели свойств: заголовок (клик разворачивает/сворачивает)
// + анимированное содержимое через grid-template-rows. Без бизнес-логики —
// что показывать внутри, решает родитель через слот default.
const props = defineProps({
  label: { type: String, required: true },
  open: { type: Boolean, default: true },
})
const emit = defineEmits(['update:open'])

function toggle() {
  emit('update:open', !props.open)
}
</script>

<template>
  <div class="section">
    <div class="section-header" @click="toggle">
      <span class="section-label">{{ label }}</span>
      <button class="toggle-btn" @click.stop="toggle">
        {{ open ? '▾' : '▸' }}
      </button>
    </div>
    <div class="section-content" :class="{ collapsed: !open }">
      <div>
        <slot />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.section {
  border-bottom: 1px solid var(--color-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;

  &:hover .section-label {
    color: var(--color-text-1);
  }
}

.section-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: color var(--transition-fast);
}

.toggle-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-3);
  cursor: pointer;
  font-size: var(--text-sm);
  line-height: 1;
  padding: 0;
}

.section-content {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows var(--transition-normal);

  &.collapsed {
    grid-template-rows: 0fr;
  }

  & > div {
    min-height: 0;
    overflow: hidden;
  }
}
</style>
