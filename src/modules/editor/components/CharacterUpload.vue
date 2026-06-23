<script setup>
import { ref } from 'vue'
import { Upload, X } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useImageLoader } from '../composables/useImageLoader'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()

const fileInput = ref(null)
const isDragOver = ref(false)
const previewUrl = ref(null)

function triggerFileInput() { fileInput.value.click() }

async function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  const img = await loadFromFile(file)
  previewUrl.value = URL.createObjectURL(file)
  store.loadCharImage(img)
  const maxDim = Math.max(img.width, img.height)
  const scale = Math.min(1, (store.canvasSize * 0.8) / maxDim)
  store.setCharScale(scale)
  store.setCharPosition(0, 0)
}

async function onFileChange(e) { await loadFile(e.target.files[0]) }
async function onDrop(e) {
  isDragOver.value = false
  await loadFile(e.dataTransfer.files[0])
}

function removeChar() {
  store.loadCharImage(null)
  previewUrl.value = null
  fileInput.value.value = ''
}
</script>

<template>
  <div class="character-upload">
    <div
      v-if="!store.hasChar"
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragOver }"
      @click="triggerFileInput"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <Upload :size="24" />
      <span>Загрузить персонажа</span>
      <span class="drop-zone__hint">PNG, JPG или перетащи файл</span>
    </div>

    <div v-else class="char-preview">
      <div class="char-preview__thumb">
        <img :src="previewUrl" alt="Персонаж" />
      </div>
      <button class="char-preview__remove" @click="removeChar">
        <X :size="14" /> Удалить
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      style="display: none"
      @change="onFileChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.character-upload {
  padding: var(--space-3) var(--space-4);
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-2);
  font-size: var(--text-sm);
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

.char-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  &__remove {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-2);
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
  }
}
</style>
