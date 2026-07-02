<script setup>
import { ref, computed } from 'vue'
import { X, Download, AlertTriangle } from 'lucide-vue-next'
import { useEditorStore } from '@/modules/editor/store'
import { useExport } from '@/modules/editor/composables/useExport'
import { useBrushMask } from '@/modules/editor/composables/useBrushMask'

const store = useEditorStore()
const { exportToken, downloadCanvas, calcExportSize } = useExport()
const { brushCanvas, brushVersion } = useBrushMask()

const sizes = [256, 512, 1024, 2048]
const exportSize = ref(512)
const isExporting = ref(false)

const exportInfo = computed(() => {
  if (!store.isReady) return null
  const pixelSize = calcExportSize(store, exportSize.value, brushCanvas, brushVersion.value)
  // Персонаж выходит за границу клетки рамки — итоговый размер больше выбранного
  const oversized = pixelSize > exportSize.value
  return { pixelSize, oversized }
})

async function doExport(mode, format = 'png') {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const canvas = await exportToken(store, brushCanvas, {
      size: exportSize.value,
      mode,
      brushVersion: brushVersion.value,
    })
    const suffix = mode === 'char-only' ? 'char' : 'token'
    downloadCanvas(canvas, `${suffix}_${exportSize.value}`, format)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="store.exportModalOpen" class="modal-overlay" @click.self="store.closeExportModal()">
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Экспорт токена</span>
          <button class="modal__close" @click="store.closeExportModal()">
            <X :size="18" />
          </button>
        </div>

        <div class="modal__body">
          <!-- Размер -->
          <div class="modal__section">
            <div class="modal__label">Размер</div>
            <div class="size-grid">
              <button
                v-for="s in sizes"
                :key="s"
                :class="['size-btn', { active: exportSize === s }]"
                @click="exportSize = s"
              >
                {{ s }}×{{ s }}
              </button>
            </div>
          </div>

          <!-- Полный токен -->
          <div class="modal__section">
            <div class="modal__section-title">Полный токен</div>
            <p class="modal__hint">Полный токен с рамкой и фоном</p>
            <div class="modal__actions">
              <button class="export-btn" :disabled="isExporting" @click="doExport('full', 'png')">
                <Download :size="14" /> PNG
              </button>
              <button class="export-btn" :disabled="isExporting" @click="doExport('full', 'webp')">
                <Download :size="14" /> WebP
              </button>
            </div>
          </div>

          <!-- Персонаж без рамки -->
          <div class="modal__section">
            <div class="modal__section-title">Персонаж без рамки</div>
            <p class="modal__hint">
              Обрезан по форме токена, без рамки.<br />
              Подойдет для Foundry VTT с Динамическим кольцом.
            </p>
            <div class="modal__actions">
              <button
                class="export-btn"
                :disabled="isExporting"
                @click="doExport('char-only', 'png')"
              >
                <Download :size="14" /> PNG
              </button>
              <button
                class="export-btn"
                :disabled="isExporting"
                @click="doExport('char-only', 'webp')"
              >
                <Download :size="14" /> WebP
              </button>
            </div>
          </div>

          <div v-if="exportInfo?.oversized" class="modal__warning">
            <AlertTriangle :size="16" class="modal__warning-icon" />
            <span>
              Персонаж выходит за границу клетки — итоговое изображение будет больше выбранного
              размера ({{ exportInfo.pixelSize }}×{{ exportInfo.pixelSize }}px).
            </span>
          </div>

          <p v-if="isExporting" class="modal__status">Генерация…</p>
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

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-2);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
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

  &__section-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-1);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-3);
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
  }

  &__status {
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-align: center;
  }

  &__warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--color-accent);
    background: var(--color-accent-muted);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
  }

  &__warning-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
}

.size-btn {
  padding: var(--space-2) var(--space-1);
  font-size: var(--text-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;

  &.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:hover:not(.active) {
    border-color: var(--color-border-strong);
    color: var(--color-text-1);
  }
}

.export-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-1);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-bg-1);
  }

  &:hover:not(.primary):not(:disabled) {
    background: var(--color-bg-3);
    border-color: var(--color-border-strong);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
