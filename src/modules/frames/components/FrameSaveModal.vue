<script setup>
import { X } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'

// Модальное окно сохранения пресета рамки: название + выбор тегов-бейджей
// (только из справочника, создавать свои нельзя). Без бизнес-логики сохранения —
// саму загрузку ассетов и дедуп по имени делает родитель (FrameGallery).
const props = defineProps({
  open: { type: Boolean, default: false },
  name: { type: String, default: '' },
  tags: { type: Array, default: () => [] }, // [{ id, name }] — справочник
  selectedTagIds: { type: Array, default: () => [] },
  duplicateName: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['update:name', 'toggle-tag', 'confirm', 'cancel'])

function toggleTag(id) {
  if (props.saving) return
  emit('toggle-tag', id)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Сохранить рамку</span>
          <BaseButton square danger-hover @click="$emit('cancel')">
            <X :size="18" />
          </BaseButton>
        </div>

        <div class="modal__body">
          <div class="modal__section">
            <label class="modal__label">Название</label>
            <input
              :value="name"
              type="text"
              class="name-input"
              placeholder="Название рамки"
              maxlength="64"
              @input="$emit('update:name', $event.target.value)"
              @keyup.enter="$emit('confirm')"
              @keyup.esc="$emit('cancel')"
            />
            <p v-if="duplicateName" class="modal__warning-text">
              Рамка «{{ duplicateName }}» уже существует — сохранение заменит её
            </p>
          </div>

          <div class="modal__section">
            <label class="modal__label">Теги</label>
            <div v-if="tags.length" class="tag-badges">
              <button
                v-for="tag in tags"
                :key="tag.id"
                type="button"
                class="tag-badge"
                :class="{ active: selectedTagIds.includes(tag.id) }"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
            <p v-else class="modal__hint">Справочник тегов пуст</p>
          </div>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__actions">
            <BaseButton
              full-width
              variant="accent"
              :disabled="saving || !name.trim()"
              @click="$emit('confirm')"
            >
              {{ saving ? 'Сохранение...' : duplicateName ? 'Заменить' : 'Сохранить' }}
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

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
  }

  &__warning-text {
    font-size: var(--text-xs);
    color: var(--color-accent);
    line-height: var(--leading-normal);
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

.tag-badges {
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
