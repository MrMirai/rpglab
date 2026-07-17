<script setup>
import { ref, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'

// Модалка создания папки (Teleport, паттерн как FrameSaveModal): одно поле имени.
// Сам сабмит (POST /api/folders) делает родитель — модалка только собирает имя.
const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const name = ref('')
const inputEl = ref(null)

// Сбрасываем черновик и фокусируем поле при каждом открытии.
watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = ''
      nextTick(() => inputEl.value?.focus())
    }
  },
)

function confirm() {
  const trimmed = name.value.trim()
  if (trimmed) emit('confirm', trimmed)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Новая папка</span>
          <BaseButton square danger-hover @click="$emit('cancel')">
            <X :size="18" />
          </BaseButton>
        </div>

        <div class="modal__body">
          <div class="modal__section">
            <label class="modal__label">Название</label>
            <input
              ref="inputEl"
              v-model="name"
              type="text"
              class="name-input"
              placeholder="Название папки"
              maxlength="255"
              @keyup.enter="confirm"
              @keyup.esc="$emit('cancel')"
            />
          </div>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__actions">
            <BaseButton
              full-width
              variant="accent"
              :disabled="saving || !name.trim()"
              @click="confirm"
            >
              {{ saving ? 'Создание...' : 'Создать' }}
            </BaseButton>
            <BaseButton full-width :disabled="saving" @click="$emit('cancel')">Отмена</BaseButton>
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

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__label {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__error {
    font-size: var(--text-xs);
    color: var(--color-danger);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
  }
}

.name-input {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition-fast);

  &::placeholder {
    color: var(--color-text-3);
  }

  &:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-muted);
  }
}
</style>
