<script setup>
import { ref, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'

// Модалка первого сохранения проекта (Teleport, паттерн как CreateFolderModal):
// название + папка. Сам запрос делает родитель - модалка только собирает поля.
// Имя обязательно и уникально СРЕДИ ПРОЕКТОВ ОДНОЙ ПАПКИ (корень - отдельное
// пространство имён): дубль бэк отвергает с 400, поэтому ошибка приходит пропом
// и показывается инлайном под полем.
const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // Стартовое имя (например, имя рамки) - подставляется при открытии.
  defaultName: { type: String, default: '' },
  // Плоский список ВСЕХ папок пользователя: [{ id, name, parentId }].
  folders: { type: Array, default: () => [] },
  // Папка, выбранная по умолчанию (null - корень).
  defaultFolderId: { type: String, default: null },
})

const emit = defineEmits(['confirm', 'cancel'])

const name = ref('')
// В <select> значением всегда идёт строка, поэтому корень - пустая строка,
// а наружу отдаём null (бэк ждёт folderId: null для корня).
const folderId = ref('')
const inputEl = ref(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    name.value = props.defaultName
    folderId.value = props.defaultFolderId ?? ''
    nextTick(() => inputEl.value?.select())
  },
)

function confirm() {
  const trimmed = name.value.trim()
  if (trimmed) emit('confirm', { name: trimmed, folderId: folderId.value || null })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Сохранить проект</span>
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
              placeholder="Название проекта"
              maxlength="255"
              @keyup.enter="confirm"
              @keyup.esc="$emit('cancel')"
            />
          </div>

          <div class="modal__section">
            <label class="modal__label">Папка</label>
            <select v-model="folderId" class="folder-select">
              <option value="">Корень</option>
              <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                {{ folder.name }}
              </option>
            </select>
          </div>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__actions">
            <BaseButton
              full-width
              variant="accent"
              :disabled="saving || !name.trim()"
              @click="confirm"
            >
              {{ saving ? 'Сохранение...' : 'Сохранить' }}
            </BaseButton>
            <BaseButton full-width :disabled="saving" @click="$emit('cancel')">Отмена</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
// Стили повторяют CreateFolderModal - обе модалки стоят рядом на одной странице
// и должны выглядеть одинаково.
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

.name-input,
.folder-select {
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
