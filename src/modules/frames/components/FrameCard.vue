<script setup>
import { Trash2 } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'

// Карточка рамки в галерее: превью + название + кнопка удаления (если можно).
// Переиспользуется в секциях «Общедоступные»/«Свои» — без бизнес-логики,
// решение что показывать и что делать при клике отдаёт родитель.
defineProps({
  frame: { type: Object, required: true },
  active: { type: Boolean, default: false },
  deletable: { type: Boolean, default: false },
})

defineEmits(['select', 'delete'])
</script>

<template>
  <div class="frame-card-wrap">
    <button
      class="frame-card"
      :class="{ active }"
      :title="frame.name"
      @click="$emit('select', frame)"
    >
      <img :src="frame.frameAssetUrl" :alt="frame.name" class="frame-card__img" />
    </button>
    <p class="frame-card__name">{{ frame.name }}</p>
    <BaseButton
      v-if="deletable"
      square
      danger-hover
      class="frame-card__delete"
      title="Удалить рамку"
      @click.stop="$emit('delete', frame)"
    >
      <Trash2 :size="14" />
    </BaseButton>
  </div>
</template>

<style lang="scss" scoped>
.frame-card-wrap {
  position: relative;
  min-width: 0;

  &:hover .frame-card__delete {
    opacity: 1;
  }
}

.frame-card {
  aspect-ratio: 1 / 1;
  width: 100%;
  padding: 0;
  background-color: var(--color-bg-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);

  &:hover {
    border-color: var(--color-accent);
  }

  &.active {
    border-color: var(--color-accent);
    background-color: var(--color-accent-muted);
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__name {
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__delete {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    background: var(--color-bg-1);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }
}
</style>
