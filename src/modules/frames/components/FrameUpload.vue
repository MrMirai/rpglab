<script setup>
import { ImagePlus, X } from 'lucide-vue-next'
import { useEditorStore, useImageLoader } from '@/modules/editor'
import ImageDropzone from '@/shared/components/ImageDropzone.vue'

const store = useEditorStore()
const { loadFromFile } = useImageLoader()

async function loadFile(file) {
  const img = await loadFromFile(file)
  const url = URL.createObjectURL(file)
  store.loadFrameImage(img, url)
  store.frameFileName = file.name
  // Сбрасываем кастомную маску — рамка новая, нужна новая авто-маска
  store.loadMaskImage(null)
  store.useCustomMask = false
}

function onRemove() {
  store.removeFrame()
  store.useCustomMask = false
}
</script>

<template>
  <div class="frame-upload">
    <ImageDropzone
      :filled="store.hasFrame"
      accept="image/png,image/webp"
      label="Загрузить рамку"
      hint="PNG или WebP с прозрачностью"
      @select="loadFile"
    >
      <template #icon>
        <ImagePlus :size="24" />
      </template>

      <template #filled>
        <div class="frame-preview">
          <div class="frame-preview__thumb">
            <img :src="store.framePreviewUrl" alt="Рамка" />
          </div>
          <button class="frame-preview__remove" @click="onRemove">
            <X :size="14" /> Удалить
          </button>
        </div>
      </template>
    </ImageDropzone>
  </div>
</template>

<style lang="scss" scoped>
.frame-upload {
  padding: var(--space-3) var(--space-4);
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
