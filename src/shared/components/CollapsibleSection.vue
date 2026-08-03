<script setup>
// Сворачиваемая секция панели свойств: заголовок (клик разворачивает/сворачивает)
// + анимированное содержимое через grid-template-rows. Без бизнес-логики -
// что показывать внутри, решает родитель через слот default.
import { ChevronDown } from 'lucide-vue-next'

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
    <button type="button" class="section-header" @click="toggle">
      <ChevronDown :size="13" class="section-chevron" :class="{ 'is-collapsed': !open }" />
      <span class="section-label">{{ label }}</span>
    </button>
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
  width: 100%;
  // Фиксированная высота: заголовки секций выстраиваются в ровный ритм
  height: 34px;
  padding: 0 var(--space-4) 0 var(--space-3);
  background: none;
  border: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover .section-label {
    color: var(--color-text-1);
  }

  &:hover .section-chevron {
    color: var(--color-text-2);
  }
}

.section-chevron {
  flex-shrink: 0;
  color: var(--color-text-3);
  transition:
    transform var(--transition-normal),
    color var(--transition-fast);

  &.is-collapsed {
    transform: rotate(-90deg);
  }
}

.section-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: color var(--transition-fast);
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
