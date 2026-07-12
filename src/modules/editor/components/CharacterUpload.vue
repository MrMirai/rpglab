<script setup>
import { Upload, X } from 'lucide-vue-next'
import { useEditorStore } from '../store'
import { useImageLoader } from '../composables/useImageLoader'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()

async function loadFile(file) {
  if (!file.type.startsWith('image/')) return
  const img = await loadFromFile(file)
  const url = URL.createObjectURL(file)
  store.loadCharImage(img, url)
  const maxDim = Math.max(img.width, img.height)
  const scale = Math.min(1, (store.canvasSize * 0.8) / maxDim)
  store.setCharScale(scale)
  store.setCharPosition(0, 0)
}

function onRemove() {
  store.removeChar()
}
</script>

<template>
  <div class="character-upload">
    <ImageDropzone
      :filled="store.hasChar"
      accept="image/png,image/jpeg,image/webp"
      label="Загрузить персонажа"
      hint="PNG, JPG, WebP"
      @select="loadFile"
    >
      <template #icon>
        <Upload :size="24" />
      </template>

      <template #filled>
        <div class="char-preview">
          <div class="char-preview__thumb">
            <img :src="store.charPreviewUrl" alt="Персонаж" />
          </div>
          <button class="char-preview__remove" @click="onRemove">
            <X :size="14" /> Удалить
          </button>
        </div>
      </template>
    </ImageDropzone>
  </div>
</template>

<style lang="scss" scoped>
.character-upload {
  padding: var(--space-3) var(--space-4);

  // У персонажа зона крупнее фреймовой
  :deep(.drop-zone) {
    padding: var(--space-6) var(--space-4);
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
