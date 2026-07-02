<script setup>
import { ref } from 'vue'

// Переиспользуемая зона загрузки изображения: клик + drag&drop.
// Не знает, что делать с файлом — только сообщает наружу через select.
// Пока файл не загружен, показывает дефолтную зону (или слот default);
// после загрузки родитель наполняет слот filled своим превью.
defineProps({
  // Что показывать в превью — если true, рендерится слот filled вместо зоны
  filled: { type: Boolean, default: false },
  accept: { type: String, default: 'image/*' },
  label: { type: String, default: 'Загрузить изображение' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['select'])

const fileInput = ref(null)
const isDragOver = ref(false)

function triggerFileInput() {
  fileInput.value.click()
}

function emitFile(file) {
  if (!file) return
  emit('select', file)
}

function onFileChange(e) {
  emitFile(e.target.files[0])
  // Сброс, чтобы повторный выбор того же файла тоже сработал
  e.target.value = ''
}

function onDrop(e) {
  isDragOver.value = false
  emitFile(e.dataTransfer.files[0])
}
</script>

<template>
  <div class="image-dropzone">
    <slot v-if="filled" name="filled" />

    <div
      v-else
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragOver }"
      @click="triggerFileInput"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <slot>
        <slot name="icon" />
        <span>{{ label }}</span>
        <span v-if="hint" class="drop-zone__hint">{{ hint }}</span>
      </slot>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      style="display: none"
      @change="onFileChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-4);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-2);
  font-size: var(--text-sm);
  text-align: center;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);

  &:hover,
  &--active {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
  }
}
</style>
