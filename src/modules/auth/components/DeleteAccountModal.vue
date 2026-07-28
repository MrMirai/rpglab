<script setup>
import { ref, watch } from 'vue'
import { X, AlertTriangle } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'

// Подтверждение удаления аккаунта. Отдельная модалка, а не общий ConfirmDialog:
// бэк требует ТЕКУЩИЙ ПАРОЛЬ в теле DELETE /api/auth/me (одного перехваченного
// access-токена не должно хватать, чтобы стереть аккаунт), поэтому нужна форма
// с полем ввода, а не просто «да/нет». Логики нет — политику задаёт родитель.
const props = defineProps({
  open: { type: Boolean, default: false },
  // Email аккаунта — показываем, ЧТО именно удаляется (у пользователя может
  // быть несколько аккаунтов, а модалка необратима)
  email: { type: String, default: '' },
  pending: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const password = ref('')

// Пароль не остаётся в памяти компонента между открытиями (в т.ч. после отмены).
watch(
  () => props.open,
  () => {
    password.value = ''
  },
)

function submit() {
  if (!password.value || props.pending) return
  emit('confirm', password.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Удалить аккаунт</span>
          <BaseButton square danger-hover @click="$emit('cancel')">
            <X :size="18" />
          </BaseButton>
        </div>

        <form class="modal__body" @submit.prevent="submit">
          <p class="modal__message">
            Аккаунт <strong>{{ email }}</strong> и всё его содержимое — рамки, проекты, папки и
            загруженные файлы — будут удалены безвозвратно. Восстановить их будет нельзя.
          </p>

          <div class="modal__field">
            <label for="delete-account-password">Подтвердите текущим паролем</label>
            <input
              id="delete-account-password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              :aria-invalid="!!error"
              :disabled="pending"
            />
          </div>

          <div v-if="error" class="modal__warning">
            <AlertTriangle :size="14" class="modal__warning-icon" />
            <span>{{ error }}</span>
          </div>

          <div class="modal__actions">
            <BaseButton
              type="submit"
              full-width
              variant="danger"
              :disabled="pending || !password"
            >
              {{ pending ? 'Удаление...' : 'Удалить навсегда' }}
            </BaseButton>
            <BaseButton full-width variant="outline" :disabled="pending" @click="$emit('cancel')">
              Отмена
            </BaseButton>
          </div>
        </form>
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
  width: 420px;
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
    padding: var(--space-4) var(--space-5) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__message {
    font-size: var(--text-sm);
    color: var(--color-text-2);
    line-height: var(--leading-normal);

    strong {
      color: var(--color-text-1);
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    label {
      font-size: var(--text-sm);
      color: var(--color-text-2);
    }

    input {
      padding: var(--space-2) var(--space-3);
      background: var(--color-bg-1);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-1);
      font-family: inherit;
      font-size: var(--text-sm);
      outline: none;
      transition: border-color var(--transition-fast);

      &:focus {
        border-color: var(--color-accent);
      }

      &[aria-invalid='true'] {
        border-color: var(--color-danger);
      }

      &::placeholder {
        color: var(--color-text-3);
      }
    }
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
