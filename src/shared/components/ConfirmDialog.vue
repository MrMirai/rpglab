<script setup>
import { X, AlertTriangle } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

// Универсальная модалка подтверждения — без бизнес-логики, только UI и события.
// Политику (что делать при confirm, как обрабатывать ошибку) задаёт родитель.
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Удалить' },
  danger: { type: Boolean, default: true },
  pending: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">{{ title }}</span>
          <BaseButton square danger-hover @click="$emit('cancel')">
            <X :size="18" />
          </BaseButton>
        </div>

        <div class="modal__body">
          <p v-if="message" class="modal__message">{{ message }}</p>

          <div v-if="error" class="modal__warning">
            <AlertTriangle :size="14" class="modal__warning-icon" />
            <span>{{ error }}</span>
          </div>

          <div class="modal__actions">
            <BaseButton
              full-width
              :variant="danger ? 'danger' : 'outline'"
              :disabled="pending"
              @click="$emit('confirm')"
            >
              {{ pending ? 'Удаление...' : confirmLabel }}
            </BaseButton>
            <BaseButton full-width variant="outline" :disabled="pending" @click="$emit('cancel')">
              Отмена
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl);
  width: 380px;
  max-width: 90vw;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-1);
  }

  &__body {
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__message {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    line-height: var(--leading-normal);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
  }

  &__warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--color-danger);
    background: rgba(192, 84, 74, 0.12);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-md);
  }

  &__warning-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }
}
</style>
