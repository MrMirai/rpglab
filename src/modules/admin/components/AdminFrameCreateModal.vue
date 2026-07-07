<script setup>
import { ref, computed } from 'vue'
import { X, ImagePlus } from 'lucide-vue-next'
import BaseButton from '@/shared/components/BaseButton.vue'
import TagBadgeList from '@/shared/components/TagBadgeList.vue'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'

// Форма создания системной рамки (POST /api/admin/frames). Отличается от
// пользовательского FrameSaveModal форматом запроса — тут файлы выбираются
// прямо в модалке (не берутся из уже загруженного в редактор пресета).
defineProps({
  open: { type: Boolean, default: false },
  tags: { type: Array, default: () => [] }, // [{ id, name }] — справочник
  creating: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const name = ref('')
const frameFile = ref(null)
const framePreviewUrl = ref('')
const backgroundFile = ref(null)
const backgroundPreviewUrl = ref('')
const selectedTagIds = ref([])

function reset() {
  name.value = ''
  frameFile.value = null
  framePreviewUrl.value = ''
  backgroundFile.value = null
  backgroundPreviewUrl.value = ''
  selectedTagIds.value = []
}

defineExpose({ reset })

function onSelectFrame(file) {
  frameFile.value = file
  framePreviewUrl.value = URL.createObjectURL(file)
}

function removeFrame() {
  frameFile.value = null
  framePreviewUrl.value = ''
}

function onSelectBackground(file) {
  backgroundFile.value = file
  backgroundPreviewUrl.value = URL.createObjectURL(file)
}

function removeBackground() {
  backgroundFile.value = null
  backgroundPreviewUrl.value = ''
}

function toggleTag(id) {
  const i = selectedTagIds.value.indexOf(id)
  if (i === -1) selectedTagIds.value.push(id)
  else selectedTagIds.value.splice(i, 1)
}

const canSubmit = computed(() => name.value.trim() && frameFile.value)

function handleConfirm() {
  if (!canSubmit.value) return
  emit('confirm', {
    name: name.value.trim(),
    frameImage: frameFile.value,
    backgroundImage: backgroundFile.value,
    tagIds: selectedTagIds.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Новая системная рамка</span>
          <BaseButton square danger-hover @click="$emit('cancel')">
            <X :size="18" />
          </BaseButton>
        </div>

        <div class="modal__body">
          <div class="modal__section">
            <label class="modal__label">Название</label>
            <input
              v-model="name"
              type="text"
              class="name-input"
              placeholder="Название рамки"
              maxlength="64"
            />
          </div>

          <div class="modal__section">
            <label class="modal__label">Изображение рамки</label>
            <ImageDropzone
              :filled="!!framePreviewUrl"
              accept="image/png"
              label="Загрузить рамку"
              hint="PNG с прозрачностью"
              @select="onSelectFrame"
            >
              <template #icon>
                <ImagePlus :size="24" />
              </template>
              <template #filled>
                <div class="file-preview">
                  <div class="file-preview__thumb">
                    <img :src="framePreviewUrl" alt="Рамка" />
                  </div>
                  <BaseButton size="sm" full-width danger-hover @click="removeFrame">
                    <X :size="14" /> Удалить
                  </BaseButton>
                </div>
              </template>
            </ImageDropzone>
          </div>

          <div class="modal__section">
            <label class="modal__label">Фон-компаньон (опционально)</label>
            <ImageDropzone
              :filled="!!backgroundPreviewUrl"
              accept="image/*"
              label="Загрузить фон"
              hint="PNG или JPG"
              @select="onSelectBackground"
            >
              <template #icon>
                <ImagePlus :size="24" />
              </template>
              <template #filled>
                <div class="file-preview">
                  <div class="file-preview__thumb">
                    <img :src="backgroundPreviewUrl" alt="Фон" />
                  </div>
                  <BaseButton size="sm" full-width danger-hover @click="removeBackground">
                    <X :size="14" /> Удалить
                  </BaseButton>
                </div>
              </template>
            </ImageDropzone>
          </div>

          <div class="modal__section">
            <label class="modal__label">Теги (опционально)</label>
            <TagBadgeList
              v-if="tags.length"
              :tags="tags.map((t) => ({ id: t.id, label: t.name }))"
              :active-ids="selectedTagIds"
              @toggle="toggleTag"
            />
            <p v-else class="modal__hint">Справочник тегов пуст</p>
          </div>

          <p v-if="error" class="modal__error">{{ error }}</p>

          <div class="modal__actions">
            <BaseButton
              full-width
              variant="accent"
              :disabled="creating || !canSubmit"
              @click="handleConfirm"
            >
              {{ creating ? 'Создание...' : 'Создать рамку' }}
            </BaseButton>
            <BaseButton full-width :disabled="creating" @click="$emit('cancel')">Отмена</BaseButton>
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
  width: 420px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
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
    overflow-y: auto;
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

.file-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-bg-1);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
}
</style>
