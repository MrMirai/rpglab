<script setup>
import { ref } from 'vue'
import { ImagePlus, X } from 'lucide-vue-next'
import { useEditorStore } from '@/modules/editor/store'
import { useImageLoader } from '@/modules/editor/composables/useImageLoader'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()

const fileInput = ref(null)
const isDragOver = ref(false)
const previewUrl = ref(null)
const fileName = ref('')

function triggerFileInput() { fileInput.value.click() }

async function loadFile(file) {
  if (!file || file.type !== 'image/png') return
  const img = await loadFromFile(file)
  previewUrl.value = URL.createObjectURL(file)
  fileName.value = file.name
  store.loadFrameImage(img)
  // Сбрасываем кастомную маску — рамка новая, нужна новая авто-маска
  store.loadMaskImage(null)
  store.useCustomMask = false
}

async function onFileChange(e) { await loadFile(e.target.files[0]) }
async function onDrop(e) {
  isDragOver.value = false
  await loadFile(e.dataTransfer.files[0])
}

function removeFrame() {
  store.loadFrameImage(null)
  store.loadMaskImage(null)
  previewUrl.value = null
  fileName.value = ''
  fileInput.value.value = ''
}
</script>

<template>
  <div class="frame-upload">
    <div
      v-if="!store.hasFrame"
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragOver }"
      @click="triggerFileInput"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <ImagePlus :size="24" />
      <span>Загрузить рамку</span>
      <span class="drop-zone__hint">PNG с прозрачностью</span>
    </div>

    <div v-else class="frame-preview">
      <div class="frame-preview__thumb">
        <img :src="previewUrl" alt="Рамка" />
      </div>
      <div class="frame-preview__info">
        <span class="frame-preview__name">{{ fileName }}</span>
        <button class="frame-preview__remove" @click="removeFrame">
          <X :size="14" />
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png"
      style="display: none"
      @change="onFileChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.frame-upload {
  padding: var(--space-3) var(--space-4);
}

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

.frame-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    background: var(--color-bg-1);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  &__info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  &__name {
    font-size: var(--text-xs);
    color: var(--color-text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__remove {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-2);
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
